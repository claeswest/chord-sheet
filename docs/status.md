# Project status — pick-up notes

*Last updated: 27 July 2026*

Read this first when starting work on a new machine or in a fresh session. It
covers what the code can't tell you: what was learned, what was decided and why,
and what's worth doing next.

> **This repository is public.** Never commit customer names, email addresses,
> revenue figures or `.env`. Live numbers belong in `/admin`, not in git.

---

## Where things stand

ChordSheetMaker is live at [chordsheetmaker.ai](https://chordsheetmaker.ai),
built and run by one person. There are paying subscribers and a Google Ads
campaign bringing a steady trickle of signups — **current figures are in
`/admin`** (dashboard, users, activity).

The product does what it promises: get a chord chart, make it beautiful,
transpose it, play it hands-free, share or print it. **The constraint is no
longer features — it's retention and conversion.**

## What the data said (analysis, 27 July 2026)

Run against the activity log, which has recorded events since 5 July.

1. **Retention is the bottleneck.** Most signups never came back after their
   first day. Nobody on the free plan was anywhere near the 5-song limit, which
   means almost nobody was reaching the moment that triggers an upgrade. Fixing
   "why return tomorrow?" matters more than any new feature.
2. **Guests build, then vanish.** In the first days of anonymous logging, dozens
   of unique guests created or imported a song — far more than the signups in the
   same window. They're doing the work and leaving with it stuck in localStorage.
   This is the single biggest leak.
3. **The best features were invisible.** Only a couple of users had *ever* used
   AI styling or AI backgrounds, and categories were barely touched, despite
   both being differentiators. Not a demand problem — a discovery problem.
4. **Photo import is underused** relative to how well it demos, because it's
   buried as a tab rather than offered as a headline path.

## What was built in response (July 2026)

- **Guest "keep your song" modal** — one-time, fires at the moment of pride
  (leaving play mode with an edited chart), never over the untouched demo.
- **"Make it stunning" callout + panel explainers** — surfaces that the AI
  *reads the song's lyrics* to choose colours, fonts and background.
- **Categories discovery tip** — appears at 3+ songs with no folders yet.
- **Share pages became a growth loop** — logged-out viewers get a
  "Make your own — free" CTA; bandmates are the warmest leads.
- **Admin email drip** — 7 manual templates with a suggested sequence, a 3-day
  cooldown, per-user send history, and signed one-click unsubscribe.
- **Landing page overhaul** — proof moved above the fold, real screenshots of
  live share pages instead of CSS mock-ups, a real how-it-works section, honest
  secondary CTA, trust microcopy.
- **Activity log** — 15 event types incl. anonymous guests, throttled repeats
  that can be expanded in the admin feed, and song "origin" tracking (how each
  song was created).

## Decisions worth knowing

| Decision | Why |
| --- | --- |
| **Setlists & collections are free** | Organising is what makes someone come back and accumulate songs — it feeds the 5-song limit rather than competing with it. The API never gated it; the pricing table was the thing that was wrong. |
| **Guests are first-class** | The whole editor works with no account. The demo path *is* the funnel; asking for signup before value is what loses people. |
| **Emails stay manual for now** | Deliberate: the founder reads the replies. Automation is the obvious next step, and `suggestNextTemplate()` + the cooldown already encode the logic. |
| **Local dev uses the production database** | There is no separate dev DB. Test data shows up in the real admin feed. See the README warning. |
| **Share links are detached snapshots** | A link keeps working after the song changes — but there's no owner recorded, so shares can't be listed or revoked. Adding `userId` would fix that. |

## Next up (rough priority)

1. **Automate the lifecycle emails.** Especially a day-0 welcome and an
   automatic nudge the moment someone hits the 5-song limit — the hottest
   moment in the funnel currently depends on the founder noticing.
2. **Give free users a taste of Pro** — one watermarked PDF, one share link.
   People don't buy what they've never felt.
3. **Audit the paywall moments** (6th song, PDF, share): each should show the
   benefit, the price, "7 days free, no charge today" and a one-click path.
4. **Feed conversions back to Google Ads.** If signup/trial events aren't
   reported as conversions, Smart Bidding optimises for clicks, not customers.
5. **Replace the placeholder testimonial.** "Emma Larson" on the landing page is
   invented. There are real customers now — the 💬 *Feedback ask* email exists
   precisely to collect a usable quote.
6. **Give people a reason to return** — e.g. play-through-a-setlist (prev/next
   in play mode, which doesn't exist yet), or PWA install so the app lives on
   the tablet home screen.

## Watchpoints

- **The founder's own test subscription** converts like any other — check
  `/admin/users` so you aren't paying yourself.
- **Trials convert 7 days after signup.** Worth a personal email during the
  trial week; new subscribers are the best source of real testimonials.
- **Dormant users** are visible in `/admin/activity` (filter out your own
  activity with the checkbox). The win-back email is for exactly them.
- **`plans.ts` is the single source of truth** for tiers. Change it there and
  the pricing tables, paywalls and gates all follow — don't hard-code tier rules.

## Where to look

| For | Read |
| --- | --- |
| Setting up on a new machine | [`README.md`](../README.md) |
| How the whole system fits together | [`ChordSheetMaker-System-Overview.md`](../ChordSheetMaker-System-Overview.md) — incl. exact Mermaid diagrams |
| A visual walkthrough / presentation | `/tour` on the site, or [`public/tour/index.html`](../public/tour/index.html) |
| Product positioning and ideas | [`ChordSheetMaker-Brief.md`](../ChordSheetMaker-Brief.md) |
| Poster naming & regeneration | [`docs/posters.md`](posters.md) |
| Live numbers, users, activity | `/admin` |
