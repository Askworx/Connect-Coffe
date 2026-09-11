# Connect Speciality Coffee Roasters — WhatsApp marketing bot

A WhatsApp bot and marketing panel for Connect Speciality Coffee Roasters,
RR Nagar, Bengaluru. Built from the AskWorx bot, reusing its WhatsApp plumbing,
admin API and panel, with a cafe conversation and marketing features on top.

```
bot/      Go — WhatsApp webhook, conversation, scheduler, admin API
panel/    React (Vite) — the marketing panel
assets/   the cafe's own photos and logo
scripts/  say.sh — pretend to be a customer, without WhatsApp
```

## What it does

**For customers, on WhatsApp**
- **"hi"** → welcome photo, who we are, hours, phone, and Menu / Book / Visit Us
- **Menu** → menu photos
- **Book** → table or workshop, then date, time, people and name; saved as a
  booking, the cafe is alerted, the customer gets a confirmation
- **Visit Us** → address, hours, directions, Zomato and Instagram
- FAQ answers (Wi-Fi, timings, location, prices, beans, delivery, workshops)
- **1 hour after someone first messages** → an automatic welcome offer (once
  per person per 30 days; timing and text in Bot Settings)
- STOP / SUBSCRIBE

**For the cafe, in the panel**
- **Overview** — contacts, reachable now, bookings to confirm, offers sent;
  donuts for bookings and audience; message activity and busiest hours
- **Offers** — templates (good morning, 20% off, visit us, fresh roast,
  workshop, evening, weekend), photo + text + buttons, live WhatsApp preview,
  send now or schedule
- **Inbox** — reply to customers; shows who can be messaged free
- **Contacts** — add, import (CSV / phone .vcf / paste), opt-out
- **Bookings** — confirm, reschedule, mark visited
- **Bot Settings** — every message, photo, button label and FAQ

Everything is sent as ordinary WhatsApp messages inside the customer's
24-hour window, so it is free. See `panel/DESIGN.md` §7.

## Run it locally

Needs Go, Node 20+, PostgreSQL.

```bash
createdb connect_coffee
cp bot/.env.example bot/.env      # fill SESSION_SECRET, ADMIN_PASSWORD, DATABASE_URL
cp panel/.env.example panel/.env.local

cd bot && go build -o connect-bot . && ./connect-bot      # :8090, creates tables
cd panel && npm install && npx vite --port 5175           # http://localhost:5175
```

With `ACCESS_TOKEN` empty the bot runs **dry**: it logs what it would send and
shows it in the panel. Try it with `scripts/say.sh "hi"`,
`scripts/say.sh --button book`, and so on.

## Connect a WhatsApp number (Meta test number)

1. developers.facebook.com → the **Connect** app → WhatsApp → API Setup.
   Copy the phone number ID and generate an access token (temporary tokens
   last about 24 hours — use a system-user token for anything longer).
2. Put them in `bot/.env` as `PHONE_NUMBER_ID` and `ACCESS_TOKEN`.
3. Expose the bot: `ngrok http 8090`, and set `PUBLIC_URL` to the https URL.
4. WhatsApp → Configuration → Webhook: callback `PUBLIC_URL/webhook`, verify
   token = `VERIFY_TOKEN` from `.env`; subscribe to **messages**.
5. A test number only sends to the (up to 5) phones listed under "To".

The bot ignores deliveries addressed to any other phone number ID, so a Meta
app subscribed to several WhatsApp accounts cannot make it answer for them.
