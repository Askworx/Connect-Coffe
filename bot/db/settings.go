package db

import (
	"context"
	"log"
	"strings"
)

// CreateSettingsTables creates and seeds the tables the bot's wording lives
// in. It runs before migration.sql, and seeds with ON CONFLICT DO NOTHING, so
// anything edited in the panel survives a restart.
func CreateSettingsTables() {
	ctx := context.Background()
	if _, err := Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`); err != nil {
		log.Fatal("Error creating settings table:", err)
	}
	// Created here as well as in migration.sql because the FAQs are seeded
	// now, before the migration runs.
	if _, err := Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS faqs (
			id SERIAL PRIMARY KEY,
			keywords TEXT NOT NULL,
			answer TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`); err != nil {
		log.Fatal("Error creating faqs table:", err)
	}
	seedSettings()
	seedFAQs()
}

// Placeholder photos until the cafe's own (from its Google listing) are in
// assets/. Every one is a setting, so swapping them needs no code change.
const (
	placeholderWelcome = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200"
	placeholderMenu1   = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200"
	placeholderMenu2   = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200"
	placeholderPromo   = "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200"
)

const cafeAddress = "BEML, 1565, Raghavendra Arcade, Ground Floor, 6th Main, 1st Cross, 2nd Main Rd, near Rajsri Apartment Block-B, Durga Parameshwari Layout, 5th Stage, Rajarajeshwari Nagar, Bengaluru 560098"

// Phone from the cafe's Zomato listing; hours from the owner.
const (
	cafePhone = "+91 96067 52452"
	cafeHours = "8 AM – 9 PM"
)

const mapsLink = "https://www.google.com/maps/search/?api=1&query=1565%2C+1st+Cross+Road%2C+Rajarajeshwari+Nagar%2C+Bengaluru%2C+Karnataka+560098"

var defaultSettings = map[string]string{
	// ── Welcome ──────────────────────────────────────────────────────────
	"welcome_image": placeholderWelcome,
	"welcome_body": "☕ *Welcome to {{company}}!*\n\n" +
		"Speciality coffee, roasted in-house, in RR Nagar, Bengaluru.\n\n" +
		"✨ Hand-brewed speciality coffee\n" +
		"🫘 Fresh beans, roasted right here\n" +
		"🎨 Coffee workshops & tastings\n\n" +
		"📍 BEML 5th Stage, RR Nagar\n" +
		"🕐 " + cafeHours + "\n" +
		"📞 " + cafePhone + "\n\n" +
		"What would you like to do?",

	// ── Menu ─────────────────────────────────────────────────────────────
	// One image address per line; each is sent as its own photo.
	"menu_images": placeholderMenu1 + "\n" + placeholderMenu2,
	"menu_body":   "☕ *Our Menu*\n\nEverything we serve is in the photos above.\n\nFancy a seat? Book a table below 👇",

	// ── Booking ──────────────────────────────────────────────────────────
	"booking_intro": "📅 *Book with us*\n\n" +
		"🪑 *Table* — a spot for you and your friends.\n" +
		"🎨 *Workshop* — coffee painting (₹649), brewing classes and tastings. Dates are on our Instagram @connect_roasters.\n\n" +
		"What would you like to book?",
	"booking_date_prompt":   "📆 Which *date*?\n\nFor example: _Saturday 14 Sep_ or _tomorrow_",
	"booking_time_prompt":   "🕐 What *time*?\n\nFor example: _6 PM_",
	"booking_people_prompt": "👥 How many *people*?\n\nJust the number, for example: _4_",
	"booking_name_prompt":   "🙂 And the *name* for the booking?",
	"booking_done":          "✅ *Booking request received!*\n\n{{booking}}\n\nWe'll confirm it here on WhatsApp shortly. See you soon ☕",

	// ── Visit ────────────────────────────────────────────────────────────
	"visit_body": "📍 *Visit us*\n\n" + cafeAddress + "\n\n" +
		"🕐 Open " + cafeHours + "\n" +
		"📞 Call us: " + cafePhone + "\n\n" +
		"🗺️ Directions: " + mapsLink + "\n" +
		"🛵 Also on Zomato: https://www.zomato.com/bangalore/connect-speciality-coffee-roasters-rajarajeshwari-nagar-bangalore\n" +
		"📸 Instagram: https://www.instagram.com/connect_roasters/",
	// A tappable map pin is sent when both are set. Left empty until the
	// cafe's exact coordinates are copied from its Google Maps listing.
	"location_lat":  "",
	"location_lng":  "",
	"location_name": "Connect Speciality Coffee Roasters",

	// ── Anything the bot does not recognise ──────────────────────────────
	"fallback_body": "Thanks for your message! ☕ Our team will reply here shortly.\n\nMeanwhile, you can:",

	// ── The follow-up promotion ──────────────────────────────────────────
	// Sent once, promo_delay_minutes after someone starts chatting, while
	// their free 24-hour window is still open. Not again for
	// promo_repeat_days. Set promo_enabled to "off" to stop it.
	"promo_enabled":       "on",
	"promo_delay_minutes": "60",
	"promo_repeat_days":   "30",
	"promo_image":         placeholderPromo,
	"promo_body":          "🎁 *A little welcome gift*\n\nShow this message at the counter on your first visit and get *10% off* your order. ☕\n\nSee you at Connect!",

	// ── Broadcasts ───────────────────────────────────────────────────────
	"poster_footer": "📍 RR Nagar 5th Stage, Bengaluru\n📸 @connect_roasters",

	// ── Subscriptions ────────────────────────────────────────────────────
	"optout_done": "✅ Done — you won't get offers or updates from us any more. Say *hi* any time to chat again.",
	"optin_done":  "✅ You're subscribed again. We'll share offers and new roasts now and then ☕",

	// ── Button labels (WhatsApp cuts them at 20 characters) ──────────────
	"btn_view_menu":     "☕ Menu",
	"btn_book":          "📅 Book",
	"btn_visit":         "📍 Visit Us",
	"btn_main_menu":     "🏠 Home",
	"btn_book_table":    "🪑 Table",
	"btn_book_workshop": "🎨 Workshop",
	"btn_book_now":      "📅 Book Now",
	"btn_opt_out":       "🛑 Stop offers",
}

func seedSettings() {
	for k, v := range defaultSettings {
		Pool.Exec(context.Background(),
			"INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", k, v)
	}
}

func seedFAQs() {
	faqs := []struct{ keywords, answer string }{
		{"wifi, wi-fi, internet, password", "📶 Yes, we have free Wi-Fi! Ask at the counter for today's password."},
		{"timing, timings, hours, open today, closing, close at", "🕐 We're open " + cafeHours + ".\n\n📞 " + cafePhone + " · tap *Visit Us* for directions."},
		{"where are you, address, location, directions, how to reach", "📍 " + cafeAddress + "\n\n🗺️ " + mapsLink},
		{"price, prices, cost, how much, rate", "💰 All our prices are on the menu — say *menu* to see it."},
		{"beans, buy coffee, coffee powder, roast, roasted", "🫘 We roast our own beans in-house. Ask at the counter for today's roasts, or tell us here what you like and we'll help you pick."},
		{"zomato, delivery, deliver, order online", "🛵 We're on Zomato: https://www.zomato.com/bangalore/connect-speciality-coffee-roasters-rajarajeshwari-nagar-bangalore"},
		{"workshop, class, painting, tasting", "🎨 We run coffee painting (₹649), brewing classes and tastings. Say *book* to reserve a seat, or see dates on Instagram @connect_roasters."},
	}
	for _, f := range faqs {
		Pool.Exec(context.Background(),
			"INSERT INTO faqs (keywords, answer) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE keywords = $1)",
			f.keywords, f.answer)
	}
}

type FAQ struct {
	ID       int    `json:"id"`
	Keywords string `json:"keywords"`
	Answer   string `json:"answer"`
}

func GetAllFAQs() ([]FAQ, error) {
	rows, err := Pool.Query(context.Background(), "SELECT id, keywords, answer FROM faqs ORDER BY id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var faqs []FAQ
	for rows.Next() {
		var f FAQ
		rows.Scan(&f.ID, &f.Keywords, &f.Answer)
		faqs = append(faqs, f)
	}
	return faqs, nil
}

func SaveFAQ(f FAQ) error {
	if f.ID == 0 {
		_, err := Pool.Exec(context.Background(), "INSERT INTO faqs (keywords, answer) VALUES ($1, $2)", f.Keywords, f.Answer)
		return err
	}
	_, err := Pool.Exec(context.Background(), "UPDATE faqs SET keywords = $1, answer = $2 WHERE id = $3", f.Keywords, f.Answer, f.ID)
	return err
}

func DeleteFAQ(id int) error {
	_, err := Pool.Exec(context.Background(), "DELETE FROM faqs WHERE id = $1", id)
	return err
}

func GetSetting(key string) string {
	var val string
	err := Pool.QueryRow(context.Background(), "SELECT value FROM settings WHERE key = $1", key).Scan(&val)
	if err != nil {
		return ""
	}
	return val
}

func UpdateSetting(key, value string) error {
	_, err := Pool.Exec(context.Background(), "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", key, value)
	return err
}

func GetAllSettings() (map[string]string, error) {
	rows, err := Pool.Query(context.Background(), "SELECT key, value FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[string]string)
	for rows.Next() {
		var k, v string
		rows.Scan(&k, &v)
		res[k] = v
	}
	return res, nil
}

// SettingOr returns the stored value for key, falling back to def when the
// row is missing or has been emptied, so an unseeded key never sends an empty
// WhatsApp message.
func SettingOr(key, def string) string {
	if v := GetSetting(key); strings.TrimSpace(v) != "" {
		return v
	}
	return def
}

// ButtonLabel returns the label for a WhatsApp button, keyed by its action id,
// so the same action carries the same words on every screen.
func ButtonLabel(id, def string) string {
	return SettingOr("btn_"+id, def)
}
