package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"connect-coffee-bot/db"
)

// maxOffersShown caps how many offers one tap sends, so the chat is not
// flooded if the panel has a long list switched on.
const maxOffersShown = 5

// cafeTime is the café's time zone, for showing an offer's end date. The
// fixed zone is the fallback on a host without time zone data.
var cafeTime = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Kolkata"); err == nil {
		return loc
	}
	return time.FixedZone("IST", 5*3600+30*60)
}()

// validateOffer returns a message for the panel, or "" when the offer is fine.
// The limits keep the caption under WhatsApp's 1024 characters.
func validateOffer(o db.Offer) string {
	switch {
	case o.Title == "":
		return "Give the offer a title."
	case len([]rune(o.Title)) > 60:
		return "Keep the title to 60 characters or fewer."
	case len([]rune(o.Description)) > 700:
		return "Keep the description to 700 characters or fewer."
	case o.ImageURL != "" && !strings.HasPrefix(o.ImageURL, "https://") &&
		!strings.HasPrefix(o.ImageURL, "http://") && !strings.Contains(o.ImageURL, "/uploads/"):
		return "The photo must be an uploaded file or a link starting with https://."
	}
	return ""
}

func offerCaption(o db.Offer) string {
	caption := "*" + o.Title + "*"
	if o.Description != "" {
		caption += "\n\n" + o.Description
	}
	if o.EndsAt != nil {
		caption += fmt.Sprintf("\n\n⏳ Until %s", o.EndsAt.In(cafeTime).Format("2 Jan"))
	}
	return caption
}

// sendOffers shows the live offers, each with its own Claim and Home buttons.
func sendOffers(phone string) {
	resetConversation(phone)
	offers, err := db.LiveOffers(maxOffersShown)
	if err != nil {
		log.Println("[Offers] could not load offers:", err)
	}
	if len(offers) == 0 {
		sendInteractiveButtons(phone, renderTemplate(db.SettingOr("offers_empty",
			"🎁 No offers running right now. Check back soon!")), []Button{
			{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
			{ID: ActionVisit, Title: db.ButtonLabel(ActionVisit, "📍 Visit Us")},
			{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
		})
		return
	}
	for i, o := range offers {
		// The Claim id carries the offer, so the thank-you names the one tapped.
		buttons := []Button{
			{ID: fmt.Sprintf("%s:%d", ActionClaim, o.ID), Title: db.ButtonLabel(ActionClaim, "🎉 Claim")},
			{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
		}
		caption := offerCaption(o)
		if image := publicImageURL(o.ImageURL); image != "" {
			sendImageWithButtons(phone, image, caption, buttons)
		} else {
			sendInteractiveButtons(phone, caption, buttons)
		}
		if i < len(offers)-1 {
			// Meta fetches each photo before delivering it; a short gap keeps
			// the offers arriving in the order they are listed.
			time.Sleep(time.Second)
		}
	}
}

// sendClaim thanks the customer for claiming an offer and tells them where to
// come: the map pin, then the address and hours.
func sendClaim(phone, offerID string) {
	resetConversation(phone)
	name := "this offer"
	if id, err := strconv.Atoi(offerID); err == nil {
		if o, ok := db.GetOffer(id); ok && o.Title != "" {
			name = o.Title
		}
	}
	lat, errLat := strconv.ParseFloat(strings.TrimSpace(db.GetSetting("location_lat")), 64)
	lng, errLng := strconv.ParseFloat(strings.TrimSpace(db.GetSetting("location_lng")), 64)
	if errLat == nil && errLng == nil {
		sendLocation(phone, lat, lng, db.SettingOr("location_name", os.Getenv("COMPANY_NAME")), "RR Nagar, Bengaluru")
	}
	body := db.SettingOr("offer_claimed", "🎉 *Thank you for claiming {{offer}}!*\n\nCome visit us — we'll be waiting for you ☕")
	body = renderTemplate(strings.ReplaceAll(body, "{{offer}}", name))
	sendInteractiveButtons(phone, body, []Button{
		{ID: ActionMenu, Title: db.ButtonLabel(ActionMenu, "☕ Menu")},
		{ID: ActionHome, Title: db.ButtonLabel(ActionHome, "🏠 Home")},
	})
}
