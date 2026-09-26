package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"

	"connect-coffee-bot/db"
)

type SessionState string

const (
	StateMain SessionState = "main"

	// Booking, one question at a time.
	StateBookType   SessionState = "book_type"
	StateBookDate   SessionState = "book_date"
	StateBookTime   SessionState = "book_time"
	StateBookPeople SessionState = "book_people"
	StateBookName   SessionState = "book_name"
)

// Button ids. Each is handled from any point in a conversation, which is what
// a button on a broadcast or on the follow-up promotion needs: the person
// tapping it may be anywhere.
const (
	ActionHome     = "main_menu"
	ActionMenu     = "view_menu"
	ActionBook     = "book"
	ActionVisit    = "visit"
	ActionTable    = "book_table"
	ActionWorkshop = "book_workshop"
	ActionOptOut   = "opt_out"
	ActionOptIn    = "opt_in"
)

var sessions = map[string]SessionState{}

// A booking being filled in, keyed by phone.
type booking struct {
	Kind   string // "Table" or "Workshop"
	Date   string
	Time   string
	People string
	Name   string
}

func (b *booking) summary() string {
	return fmt.Sprintf("%s · %s · %s · %s %s", b.Kind, b.Date, b.Time, b.People, pluralPeople(b.People))
}

func pluralPeople(n string) string {
	if n == "1" {
		return "person"
	}
	return "people"
}

var bookings = map[string]*booking{}

// stateMu guards sessions, bookings and quizSessionStore. webhook.go starts a
// goroutine per inbound message, and concurrent map access is a fatal runtime
// error in Go, not a recoverable panic. handleMessage holds it for the whole
// conversation turn; the promotion sender takes it only to check a session.
var stateMu sync.Mutex

func handleMessage(phone, input string, lat, lng float64) {
	stateMu.Lock()
	defer stateMu.Unlock()

	text := strings.ToLower(strings.TrimSpace(input))
	db.SaveContact(phone, "")

	// ── Subscriptions ────────────────────────────────────────────────────
	if text == "stop" || input == ActionOptOut {
		db.UpdateContactOptOutByPhone(phone, true)
		sendTextMessage(phone, db.SettingOr("optout_done", "✅ Done — you won't get offers from us any more."))
		return
	}
	if text == "subscribe" || input == ActionOptIn {
		db.UpdateContactOptOutByPhone(phone, false)
		sendTextMessage(phone, db.SettingOr("optin_done", "✅ You're subscribed again."))
		return
	}

	// ── Buttons and words that work from anywhere ────────────────────────
	switch {
	case text == "hi" || text == "hello" || text == "hey" || text == "hii" || text == "start" ||
		text == "home" || input == ActionHome:
		sendWelcome(phone)
		return
	case text == "menu" || input == ActionMenu:
		sendMenu(phone)
		return
	case text == "book" || text == "booking" || input == ActionBook:
		startBooking(phone)
		return
	case text == "visit" || text == "location" || input == ActionVisit:
		sendVisit(phone)
		return
	}

	// ── A booking in progress takes whatever is typed next ───────────────
	if handleBookingStep(phone, input) {
		return
	}

	// ── Quiz answers and FAQs ────────────────────────────────────────────
	if tryAutomationModules(phone, input) {
		return
	}

	// ── Anything else: say the team will reply, and offer the menu ───────
	sendFallback(phone, input)
}

// renderTemplate fills the placeholders every message may use.
func renderTemplate(text string) string {
	return strings.NewReplacer(
		"{{company}}", os.Getenv("COMPANY_NAME"),
	).Replace(text)
}

func homeButtons() []Button {
	return []Button{
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
		{ID: ActionBook, Title: db.ButtonLabel(ActionBook, "📅 Book")},
		{ID: ActionVisit, Title: db.ButtonLabel(ActionVisit, "📍 Visit Us")},
	}
}

// ── Welcome ──────────────────────────────────────────────────────────────

func sendWelcome(phone string) {
	resetConversation(phone)
	body := renderTemplate(db.SettingOr("welcome_body", "☕ *Welcome to {{company}}!*\n\nWhat would you like to do?"))
	if image := publicImageURL(db.GetSetting("welcome_image")); image != "" {
		sendImageWithButtons(phone, image, body, homeButtons())
		return
	}
	sendInteractiveButtons(phone, body, homeButtons())
}

// ── Menu ─────────────────────────────────────────────────────────────────

func sendMenu(phone string) {
	resetConversation(phone)
	body := renderTemplate(db.SettingOr("menu_body", "☕ *Our Menu*"))
	buttons := []Button{
		{ID: ActionBook, Title: db.ButtonLabel(ActionBook, "📅 Book")},
		{ID: ActionVisit, Title: db.ButtonLabel(ActionVisit, "📍 Visit Us")},
		{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
	}
	// One PDF the customer scrolls through beats a burst of separate images,
	// and sending it as the message header keeps it above the text.
	if pdf := strings.TrimSpace(db.GetSetting("menu_pdf")); pdf != "" {
		sendDocumentWithButtons(phone, publicImageURL(pdf), db.SettingOr("menu_pdf_name", "Menu.pdf"), body, buttons)
		return
	}
	for _, url := range strings.Split(db.GetSetting("menu_images"), "\n") {
		if url = strings.TrimSpace(url); url != "" {
			sendImage(phone, publicImageURL(url), "")
		}
	}
	sendInteractiveButtons(phone, body, buttons)
}

// ── Visit ────────────────────────────────────────────────────────────────

func sendVisit(phone string) {
	resetConversation(phone)
	lat, errLat := strconv.ParseFloat(strings.TrimSpace(db.GetSetting("location_lat")), 64)
	lng, errLng := strconv.ParseFloat(strings.TrimSpace(db.GetSetting("location_lng")), 64)
	if errLat == nil && errLng == nil {
		sendLocation(phone, lat, lng, db.SettingOr("location_name", os.Getenv("COMPANY_NAME")), "RR Nagar, Bengaluru")
	}
	body := renderTemplate(db.SettingOr("visit_body", "📍 *Visit us* in RR Nagar, Bengaluru."))
	sendInteractiveButtons(phone, body, []Button{
		{ID: ActionBook, Title: db.ButtonLabel(ActionBook, "📅 Book")},
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
		{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
	})
}

// ── Booking ──────────────────────────────────────────────────────────────

func startBooking(phone string) {
	resetConversation(phone)
	sessions[phone] = StateBookType
	bookings[phone] = &booking{}
	body := renderTemplate(db.SettingOr("booking_intro", "📅 What would you like to book?"))
	sendInteractiveButtons(phone, body, []Button{
		{ID: ActionTable, Title: db.ButtonLabel(ActionTable, "🪑 Table")},
		{ID: ActionWorkshop, Title: db.ButtonLabel(ActionWorkshop, "🎨 Workshop")},
		{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
	})
}

// handleBookingStep takes the answer to the current booking question. It
// reports false when no booking is in progress.
func handleBookingStep(phone, input string) bool {
	b := bookings[phone]
	if b == nil {
		return false
	}
	answer := strings.TrimSpace(input)

	switch sessions[phone] {
	case StateBookType:
		switch input {
		case ActionTable:
			b.Kind = "Table"
		case ActionWorkshop:
			b.Kind = "Workshop"
		default:
			sendTextMessage(phone, "Please tap *Table* or *Workshop* above 👆")
			return true
		}
		sessions[phone] = StateBookDate
		sendTextMessage(phone, db.SettingOr("booking_date_prompt", "📆 Which date?"))

	case StateBookDate:
		b.Date = answer
		sessions[phone] = StateBookTime
		sendTextMessage(phone, db.SettingOr("booking_time_prompt", "🕐 What time?"))

	case StateBookTime:
		b.Time = answer
		sessions[phone] = StateBookPeople
		sendTextMessage(phone, db.SettingOr("booking_people_prompt", "👥 How many people?"))

	case StateBookPeople:
		n, err := strconv.Atoi(answer)
		if err != nil || n < 1 || n > 100 {
			sendTextMessage(phone, "Just the number of people, please — for example *4*")
			return true
		}
		b.People = strconv.Itoa(n)
		sessions[phone] = StateBookName
		sendTextMessage(phone, db.SettingOr("booking_name_prompt", "🙂 And the name for the booking?"))

	case StateBookName:
		b.Name = answer
		finishBooking(phone, b)

	default:
		return false
	}
	return true
}

func finishBooking(phone string, b *booking) {
	resetConversation(phone)

	// Bookings are kept in the leads table: the panel's Bookings page reads
	// it, and its status column carries new → contacted → closed.
	if err := db.CreateLead(phone, b.Name, b.Kind, b.summary(), phone); err != nil {
		log.Printf("[Booking] Could not save the booking for %s: %v", phone, err)
	}
	db.UpdateContactName(phone, b.Name)

	confirmation := strings.ReplaceAll(
		renderTemplate(db.SettingOr("booking_done", "✅ Booking request received!\n\n{{booking}}")),
		"{{booking}}", fmt.Sprintf("👤 %s\n📅 %s", b.Name, b.summary()))
	sendInteractiveButtons(phone, confirmation, []Button{
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
		{ID: ActionVisit, Title: db.ButtonLabel(ActionVisit, "📍 Visit Us")},
	})

	NotifyTeam(fmt.Sprintf("📅 *New booking*\n\n👤 %s\n📞 +%s\n📋 %s", b.Name, phone, b.summary()))
}

// resetConversation abandons anything half-finished, so a button tapped in
// the middle of a booking starts cleanly.
func resetConversation(phone string) {
	sessions[phone] = StateMain
	delete(bookings, phone)
	delete(quizSessionStore, phone)
}

// ── Fallback ─────────────────────────────────────────────────────────────

func sendFallback(phone, input string) {
	body := renderTemplate(db.SettingOr("fallback_body", "Thanks for your message! ☕ Our team will reply here shortly."))
	sendInteractiveButtons(phone, body, homeButtons())

	// A real question goes to the team, who answer from the panel's inbox.
	// "ok" and "👍" do not, and neither do photos or stickers.
	if len([]rune(strings.TrimSpace(input))) > 3 && !strings.HasPrefix(input, "[") {
		NotifyTeam(fmt.Sprintf("💬 *New message*\n\n📞 +%s\n%s\n\nReply from the panel's Inbox.", phone, input))
	}
}

func sendFAQAnswer(phone, answer string) {
	sendInteractiveButtons(phone, answer, homeButtons())
}
