package db

import (
	"context"
	"log"
)

// draftOffers are ready-made offers built on the cafe's own photos, added
// switched off so the admin decides which to run from the Offers page.
// Pasting this much SQL into Railway's web console garbled the lines, so the
// bot adds them itself.
var draftOffers = []Offer{
	{Title: "Buy 1 Get 1 on all coffees", ImageURL: "/uploads/photo-poster-bogo.jpg",
		Description: "Order any coffee and get a second one free.\n\nShow this message at the counter."},
	{Title: "Breakfast combo ₹299", ImageURL: "/uploads/photo-food-avotoast.jpg",
		Description: "Any sourdough toast + a regular cappuccino.\n\nAvailable all day. Save up to ₹90."},
	{Title: "Cheesecake + Iced Latte ₹299", ImageURL: "/uploads/photo-food-cheesecake.jpg",
		Description: "Your pick of Classic, Blueberry or Biscoff cheesecake with a regular Iced Latte.\n\nThe perfect afternoon treat."},
	{Title: "New: Strawberry Matcha 🍓", ImageURL: "/uploads/poster-strawberry-matcha.jpg",
		Description: "Strawberry + matcha — a combo you didn't know you needed.\n\nAsk for it at the counter this week."},
	{Title: "20% off beans to take home", ImageURL: "/uploads/photo-cold-brew-beans.jpg",
		Description: "Our in-house roasted beans, ground fresh for your brewer.\n\nAny 250 g bag, this month only."},
	{Title: "Tiramisu Bliss — coming soon", ImageURL: "/uploads/poster-tiramisu.jpg",
		Description: "Layers of coffee-soaked sponge and creamy mascarpone.\n\nBe the first to try it — ask at the counter."},
	{Title: "New: Iced Pour Over, whisky barrel aged", ImageURL: "/uploads/photo-poster-whisky.jpg",
		Description: "Bold, smooth and unmistakably refined.\n\nOur iced pour over, brewed from whisky-barrel-aged beans. Ask for it at the brew bar."},
	{Title: "Our signature Cappuccino", ImageURL: "/uploads/photo-poster-cappuccino.jpg",
		Description: "Velvety. Frothy. Tasty.\n\nMade with beans roasted right here in RR Nagar."},
	{Title: "Iced coffee happy hours", ImageURL: "/uploads/photo-iced-latte.jpg",
		Description: "10% off every iced coffee, weekdays 2–5 PM.\n\nShow this message at the counter."},
	{Title: "Morning filter coffee + banana bread", ImageURL: "/uploads/photo-filter-coffee.jpg",
		Description: "Before 11 AM, get banana bread at half price with any filter coffee.\n\nThe best way to start the day."},
	{Title: "Cold brew season", ImageURL: "/uploads/photo-drink-coldbrew.jpg",
		Description: "Slow-steeped for a smooth, low-acid cup.\n\nPerfect for a warm afternoon — ask for it over ice."},
	{Title: "Matcha weekend — 15% off", ImageURL: "/uploads/photo-matcha-jar.jpg",
		Description: "15% off any matcha drink, Saturday and Sunday.\n\nShow this message at the counter."},
	{Title: "Try the Iced Spanish Latte", ImageURL: "/uploads/photo-iced-spanish-latte.jpg",
		Description: "Creamy, gently sweet and perfectly chilled.\n\nA customer favourite — ask for it today."},
	{Title: "Brew bar: single-origin pour over", ImageURL: "/uploads/photo-pourover-glass.jpg",
		Description: "Pick any single-origin and we'll brew it as a pour over.\n\nAsk us which beans are freshest this week."},
	{Title: "Latte art workshop", ImageURL: "/uploads/photo-latte-art-top.jpg",
		Description: "Learn to steam milk and pour your first heart with our baristas.\n\nLimited seats — ask at the counter for the next date."},
	{Title: "Bring a friend — 50% off their drink", ImageURL: "/uploads/photo-iced-cappuccino.jpg",
		Description: "Come with a friend and their drink is half price.\n\nShow this message at the counter."},
	{Title: "Flat white + banana bread", ImageURL: "/uploads/photo-food-bananabread.jpg",
		Description: "A flat white with a slice of our banana bread.\n\nYour afternoon pick-me-up."},
	{Title: "Weekend special: Iced Mocha", ImageURL: "/uploads/photo-iced-mocha.jpg",
		Description: "Chocolate, espresso and cold milk over ice.\n\nThis weekend only — ask for it at the counter."},
}

// seedDraftOffers adds the drafts once. The marker setting records that it
// ran, so a draft the admin deletes stays deleted; an offer with the same
// title is skipped, so nothing is duplicated.
func seedDraftOffers() {
	const marker = "draft_offers_seeded"
	if GetSetting(marker) != "" {
		return
	}
	ctx := context.Background()
	added := 0
	for i, o := range draftOffers {
		tag, err := Pool.Exec(ctx,
			`INSERT INTO offers (title, description, image_url, active, sort_order)
			 SELECT $1::text, $2::text, $3::text, false, $4::int
			 WHERE NOT EXISTS (SELECT 1 FROM offers WHERE title = $1::text)`,
			o.Title, o.Description, o.ImageURL, 10+i)
		if err != nil {
			log.Printf("Could not add the draft offer %q: %v", o.Title, err)
			return // try again on the next boot
		}
		added += int(tag.RowsAffected())
	}
	if _, err := Pool.Exec(ctx,
		`INSERT INTO settings (key, value) VALUES ($1, 'yes') ON CONFLICT (key) DO UPDATE SET value = 'yes'`,
		marker); err != nil {
		log.Printf("Could not record that the draft offers were added: %v", err)
		return
	}
	log.Printf("Added %d draft offers (switched off) for the admin to review", added)
}
