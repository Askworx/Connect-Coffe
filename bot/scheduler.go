package main

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"connect-coffee-bot/db"

	"github.com/robfig/cron/v3"
)

func InitScheduler() {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		log.Println("Error loading location Asia/Kolkata:", err)
		loc = time.UTC
	}
	c := cron.New(cron.WithLocation(loc))

	// ── Every minute: the follow-up promotion ───────────────────────────
	if _, err := c.AddFunc("* * * * *", sendDuePromos); err != nil {
		log.Println("Error scheduling the promotion sender:", err)
	}

	// ── Every minute: broadcasts that have come due ─────────────────────
	if _, err := c.AddFunc("* * * * *", sendDueCampaigns); err != nil {
		log.Println("Error scheduling the broadcaster:", err)
	}

	c.Start()
}

// ── Follow-up promotion ──────────────────────────────────────────────────

// sendDuePromos sends the promotion to everyone who started chatting at least
// promo_delay_minutes ago and is still inside their free window. It is free
// for the same reason every other message here is: they messaged first.
func sendDuePromos() {
	if strings.ToLower(strings.TrimSpace(db.SettingOr("promo_enabled", "on"))) != "on" {
		return
	}
	delay := settingInt("promo_delay_minutes", 60, 1, 23*60)
	repeat := settingInt("promo_repeat_days", 30, 1, 3650)

	phones, err := db.GetPromoCandidates(delay, repeat)
	if err != nil {
		log.Println("[Promo] Could not read who is due:", err)
		return
	}

	image := publicImageURL(db.GetSetting("promo_image"))
	body := renderTemplate(db.SettingOr("promo_body", "🎁 A little welcome gift from {{company}}!"))
	buttons := []Button{
		{ID: ActionOffers, Title: db.ButtonLabel(ActionOffers, "🎁 Offers")},
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
		{ID: ActionOptOut, Title: db.ButtonLabel(ActionOptOut, "🛑 Stop offers")},
	}

	for _, phone := range phones {
		// Someone halfway through a booking is left alone; they are picked
		// up on a later tick, since nothing has been recorded for them yet.
		stateMu.Lock()
		busy := bookings[phone] != nil
		stateMu.Unlock()
		if busy {
			continue
		}

		if err := db.RecordPromoSend(phone); err != nil {
			log.Printf("[Promo] Could not record the promotion for %s, not sending: %v", phone, err)
			continue
		}
		log.Printf("[Promo] Sending the follow-up promotion to %s", phone)
		if image != "" {
			sendImageWithButtons(phone, image, body, buttons)
		} else {
			sendInteractiveButtons(phone, body, buttons)
		}
	}
}

// settingInt reads a whole-number setting, falling back to def when it is
// missing, unreadable or outside [min, max].
func settingInt(key string, def, min, max int) int {
	n, err := strconv.Atoi(strings.TrimSpace(db.GetSetting(key)))
	if err != nil || n < min || n > max {
		return def
	}
	return n
}

// publicImageURL turns an uploaded file's address into one Meta can fetch.
// Uploads are served at /api/uploads on this server, but the address saved
// may have been built from wherever the panel was open, or be a bare
// "/api/uploads/…" path, and Meta can only fetch from PUBLIC_URL.
func publicImageURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if i := strings.Index(raw, "/uploads/"); i >= 0 {
		// Escape the name: files uploaded before names were sanitised can hold
		// spaces or the narrow no-break space macOS puts in screenshot names,
		// and Meta fetches an unescaped one as a plain space and gets a 404.
		name := path.Base(raw[i:])
		if unescaped, err := url.PathUnescape(name); err == nil {
			name = unescaped
		}
		return strings.TrimRight(os.Getenv("PUBLIC_URL"), "/") + "/api/uploads/" + url.PathEscape(name)
	}
	return raw
}

// ── Broadcasts ───────────────────────────────────────────────────────────

func sendDueCampaigns() {
	campaigns, err := db.GetDueCampaigns()
	if err != nil {
		log.Println("[Scheduler] Error fetching due campaigns:", err)
		return
	}
	if len(campaigns) == 0 {
		return
	}

	// Only contacts inside the 24h window: broadcasts are not templates, so
	// Meta rejects them for everyone else.
	phones, err := db.GetPhonesInServiceWindow()
	if err != nil {
		log.Println("[Scheduler] Error fetching campaign recipients:", err)
		return
	}

	for _, camp := range campaigns {
		// Claim it first. Sending takes longer than the one-minute tick, so
		// without this the next run picks the same row up and sends it again.
		claimed, err := db.ClaimCampaign(camp.ID)
		if err != nil {
			log.Printf("[Scheduler] Could not claim campaign #%d, skipping: %v", camp.ID, err)
			continue
		}
		if !claimed {
			continue
		}

		log.Printf("[Scheduler] Broadcasting campaign #%d (%s) to %d contacts in the 24h window", camp.ID, camp.Type, len(phones))

		// With nobody in the window the campaign is still marked sent, to 0.
		// Leaving it due would fire it at whatever minute the next person
		// happened to message, to that one person.
		sent := 0
		if len(phones) > 0 {
			switch strings.ToLower(camp.Type) {
			case "quiz":
				broadcastQuiz(camp, phones)
				sent = len(phones)
			case "poster":
				sent = broadcastPoster(camp, phones)
			}
		}
		if strings.ToLower(camp.Type) == "poster" && camp.TemplateName != "" {
			sent += broadcastTemplate(camp)
		}

		if err := db.MarkCampaignSent(camp.ID, sent); err != nil {
			log.Printf("[Scheduler] Campaign #%d was sent but could not be marked sent: %v", camp.ID, err)
		}
	}
}

func broadcastQuiz(camp db.Campaign, phones []string) {
	quizBody := fmt.Sprintf(
		"☕ *Coffee Quiz* ☕\n\n"+
			"❓ %s\n\n"+
			"*A:* %s\n"+
			"*B:* %s\n"+
			"*C:* %s\n\n"+
			"👉 Tap your answer below!",
		camp.Question, camp.OptionA, camp.OptionB, camp.OptionC,
	)
	buttons := []Button{
		{ID: "A", Title: "Option A"},
		{ID: "B", Title: "Option B"},
		{ID: "C", Title: "Option C"},
	}

	db.DeactivateAllQuizzes()
	quizID, err := db.CreateQuizFromCampaign(camp)
	if err != nil {
		log.Printf("[Scheduler] Failed to create quiz entry: %v", err)
		return
	}
	log.Printf("[Scheduler] Activated quiz #%d", quizID)

	for _, phone := range phones {
		sendInteractiveButtons(phone, quizBody, buttons)

		// Two minutes later, an invitation to come in.
		go func(p string) {
			time.Sleep(2 * time.Minute)
			sendEngagementNudge(p)
		}(phone)
	}
}

// posterButtonActions are the button ids a poster may carry. Each is handled
// by handleMessage whatever state the conversation is in. The panel offers
// the same list.
var posterButtonActions = map[string]bool{
	ActionHome:   true, // welcome message
	ActionMenu:   true, // menu
	ActionOffers: true, // current offers
	ActionVisit:  true, // address and directions
	ActionBook:   true, // booking; kept so posters saved with it still send
}

// validateCampaignButtons returns a reason the buttons cannot be sent, or ""
// if they can. None at all is allowed: the poster then uses the defaults.
func validateCampaignButtons(buttons []db.CampaignButton) string {
	if len(buttons) > 3 {
		return "a poster can have at most 3 buttons"
	}
	seenIDs := map[string]bool{}
	seenTitles := map[string]bool{}
	for i := range buttons {
		b := &buttons[i]
		b.Title = strings.TrimSpace(b.Title)
		if b.Title == "" {
			return "every button needs text"
		}
		// WhatsApp's limit. sendImageWithButtons would otherwise cut it
		// short with an ellipsis the operator never saw.
		if len([]rune(b.Title)) > 20 {
			return fmt.Sprintf("button text %q is longer than 20 characters", b.Title)
		}
		if !posterButtonActions[b.ID] {
			return fmt.Sprintf("button %q has an action the bot does not handle", b.Title)
		}
		if seenIDs[b.ID] || seenTitles[b.Title] {
			return "two buttons cannot do the same thing or have the same text"
		}
		seenIDs[b.ID], seenTitles[b.Title] = true, true
	}
	return ""
}

// broadcastPoster sends the free message to contacts inside the window and
// returns how many Meta accepted.
func broadcastPoster(camp db.Campaign, phones []string) int {
	image := publicImageURL(camp.ImageURL)

	caption := strings.TrimSpace(camp.Caption)

	buttons := []Button{
		{ID: ActionOffers, Title: db.ButtonLabel(ActionOffers, "🎁 Offers")},
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
	}
	if len(camp.Buttons) > 0 {
		buttons = make([]Button, 0, len(camp.Buttons))
		for _, b := range camp.Buttons {
			buttons = append(buttons, Button{ID: b.ID, Title: b.Title})
		}
	}

	sent := 0
	for _, phone := range phones {
		if sendImageWithButtons(phone, image, caption, buttons) {
			sent++
		}
	}
	return sent
}

// broadcastTemplate sends the offer's marketing template to subscribed
// contacts outside the 24-hour window, the ones the free message cannot
// reach, and returns how many Meta accepted. Each one is billed by Meta.
func broadcastTemplate(camp db.Campaign) int {
	t, err := findTemplate(camp.TemplateName, camp.TemplateLang)
	if err == nil {
		if problem := templateProblem(t); problem != "" {
			err = fmt.Errorf("template %q cannot be sent: %s", t.Name, problem)
		}
	}
	if err != nil {
		log.Printf("❌ [Scheduler] Campaign #%d: no template messages sent: %v", camp.ID, err)
		return 0
	}

	phones, err := db.GetPhonesOutsideServiceWindow()
	if err != nil {
		log.Printf("❌ [Scheduler] Campaign #%d: could not list contacts for the template: %v", camp.ID, err)
		return 0
	}
	log.Printf("[Scheduler] Campaign #%d: sending template %q to %d contacts outside the 24h window", camp.ID, t.Name, len(phones))

	// The actions saved for the template win; a template made before they
	// could be set takes the offer's button actions in order.
	actions := templateActions(t.Name)
	if len(actions) == 0 {
		for _, b := range camp.Buttons {
			actions = append(actions, b.ID)
		}
	}

	image := publicImageURL(camp.ImageURL)
	sent := 0
	for _, phone := range phones {
		if sendTemplate(phone, t, image, actions) {
			sent++
		}
	}
	return sent
}
