# Connect — Marketing Panel Design System

The reference for every screen of the Connect Speciality Coffee Roasters
WhatsApp marketing panel. The panel exists to do three things: **send offers**,
**answer customers**, and **take bookings**. Every design decision serves
someone at the cafe counter doing one of those, quickly, between orders.

---

## 1. Brand

The system is taken from the cafe's logo (`assets/connect-logo.jpg` — a knot
above a coffee cup) and nothing else.

| Role | Colour | Where it comes from | Used for |
|---|---|---|---|
| **Cup blue** | `#2E5FAC` | the cup | sidebar, primary buttons, links, active states, the selected tab |
| **White** | `#FFFFFF` | the ground the logo sits on | every page and every card |
| **Cream** | `#FEFAF1` | the coffee in the cup | small accents only — never a page or panel background |

Brown is **not** part of the panel. The logo's brown knot stays in the logo.

The logo is always shown from `public/logo.png` (the real artwork with its
white background removed). On the blue sidebar it sits on a white rounded
tile; on white it sits on its own. Never redraw, recolour or crop it.

---

## 2. Colour tokens

Defined once in `src/index.css` (`@theme`). Write against the token names,
never raw hex.

| Token | Value | Use |
|---|---|---|
| `primary` | `#2E5FAC` | buttons, links, focus ring, selection, active nav text |
| `primary-hover` / `primary-dark` | `#264F90` / `#1E3F73` | hover, pressed, photo overlays |
| `primary-light` | `#EAF0F9` | tinted backgrounds behind blue text (notices, selected chips) |
| `sidebar` | `#2E5FAC` | the navigation rail |
| `ink` | `#14233D` | headings and key figures — a dark navy |
| `body-text` | `#3F4B5E` | running text |
| `text-secondary` | `#56627A` | help text, table secondary lines (5.9:1 on white) |
| `muted-text` | `#6B7587` | labels, placeholders |
| `line` / `border` | `#E4E9F1` | hairlines, card borders |
| `line-strong` | `#CBD4E2` | input borders, dashed drop zones |
| `paper` | `#F6F8FC` | table heads, hover rows — a cool near-white, not cream |
| `champagne-100` | `#FEFAF1` | the cream accent |
| `success` / `warning` / `danger` | `#4A6A4E` / `#8A6A2F` / `#A8322A` | status only — never decoration |

Contrast: every text token is WCAG AA on white. Blue buttons carry white text
(5.9:1).

---

## 3. Type

| Role | Font | Style |
|---|---|---|
| Headings, page titles, big figures | **Fraunces** (serif) | semibold, sentence case, slight negative tracking |
| Everything else | **DM Sans** | 400 / 500 / 600 |
| Phone numbers, counters | **DM Mono** | only where digits must line up |

- **Never set headings in capitals.** An unlayered rule in `index.css`
  enforces this even where older markup still says `uppercase`.
- **Eyebrows** (`.eyebrow`) are the one uppercase style: DM Sans 12px,
  semibold, 0.08em tracking, in cup blue. One per card or page header.
- Page titles use `.display-1` through `<PageHeader>`; never hand-roll one.

---

## 4. Layout

- **Sidebar**: cup blue, white text at 75%. The active page is a white pill
  with blue text and a small cream marker on its left edge. The logo and
  "Connect / Speciality Coffee Roasters" sit at the top, the signed-in email
  and Sign out at the bottom.
- **Pages**: white. Content in cards: white, `border-border`, `rounded-xl`,
  `shadow-card`. Nothing floats without a border.
- **Page header**: eyebrow → Fraunces title → one or two lines of intro → an
  action on the right (e.g. "New offer"). No background texture.
- Cards align to a 4-column grid on wide screens, 2 on tablets, 1 on phones.
  Every page works at 400px wide.

---

## 5. Components

**Buttons** — primary is blue with white text; outline is white with a grey
border; ghost is text only. One primary button per view.

**Stat cards** — bordered, white, a Fraunces figure, a label above, a hint
below. A card that needs action ("Bookings to confirm") turns solid blue when
its count is above zero, and quiet again at zero.

**Tabs** — pill group; the selected tab is solid blue.

**Badges** — status badges use the status tokens with a dot; the default badge
is blue.

**WhatsApp preview** — every message the panel can send is edited beside a
preview of how WhatsApp shows it: photo on top, the text with its formatting,
the offer footer, and the reply buttons stacked under the bubble in blue.

**Donut charts** (`components/charts/DonutChart.jsx`) — for part-to-whole with
at most four slices. Colours in this fixed order, never cycled:

| # | Colour | |
|---|---|---|
| 1 | `#2E5FAC` | cup blue |
| 2 | `#E0A030` | gold |
| 3 | `#2FA39A` | teal |
| 4 | `#8E6FD8` | violet |

Checked with the dataviz palette validator, all pairs: worst ΔE 9.9 (protan),
15.6 (normal vision) — pass. Gold and teal are under 3:1 on white, so identity
never rests on colour: every slice has a legend row with label, count and
percentage, and hovering a slice shows it in the centre. Slices have a 2px
white gap. The legend sits **under** the donut, never beside it — a narrow
card squeezed the labels to single letters.

---

## 6. Voice

The reader is the cafe owner or a barista, not a developer.

| Do | Don't |
|---|---|
| Offers | Campaigns, broadcasts |
| Bookings | Leads |
| Reachable now, free | In CSW, session window |
| "They need to message first" | "131047: re-engagement required" |

- Say what a button will do before it is pressed: the offer composer states
  how many people will receive it and that it is free.
- Errors say what happened and what to do next, in one or two sentences.

---

## 7. Marketing rules the design encodes

These are WhatsApp's rules, and the panel is built so nobody has to remember
them:

1. **The 24-hour window.** A free message (offer, reply) only reaches someone
   who messaged Connect in the last 24 hours. The panel shows "Reachable now,
   free", marks each chat green or grey, and locks the reply box when the
   window has closed.
2. **Buttons reopen the window.** Every offer carries 1–3 buttons; a tap is a
   new message from the customer.
3. **Imported contacts are not reachable until they message.** The import
   dialog says so before anything is imported.
4. **Button text ≤ 20 characters**, counted live.
5. **Photos must fit the cafe.** Connect is listed as vegetarian — no egg or
   meat dishes in template or offer photos.
6. **Only import people who agreed to hear from you.** Every offer also
   carries a way to stop (the follow-up offer has a "Stop offers" button, and
   STOP always works).

---

## 8. Placeholders still in use

Until the cafe's own photos are in `assets/` and uploaded, template and
welcome photos are online stock images (Unsplash). Swap them in Bot Settings
and in `TEMPLATES` in `src/pages/Campaigns.jsx`.
