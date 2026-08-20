# Project status — pick-up notes

*Last updated: 4 August 2026*

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

## What the data said (analysis, 4 August 2026)

A week later, against the same activity log. Numbers are in `/admin`; what
matters is the shape.

1. **The 5-song free limit has never once been reached.** Nearly every free
   user sits at two songs or fewer. The free tier, the paywall copy and the
   strongest upgrade email are all built around a moment that has not happened
   to a single person. **This is the biggest misallocation in the product.**
2. **PDF export is the only paywall that converts** — and it converts badly.
   The one trial started in this period was opened ~2 minutes after signup, to
   get through the PDF gate, and cancelled 7 minutes later after two exports.
   People are buying their way past a wall before they have felt any value.
3. **Retention is unchanged** since the July analysis, after a month of
   shipping. Logins per week are a small fraction of accounts; almost all
   activity is still first-session.
4. **Marketing email is being sent by hand at scale** — the drip machinery
   works correctly (cooldown respected, no double-sends), but the founder is
   personally doing what a scheduler should.

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
| **This is a monorepo; the app lives in `apps/chordsheetmaker`** | Room for RecipeMaker and WorksheetMaker as separate products on shared infrastructure. Run npm commands from the root. Vercel's Root Directory must stay `apps/chordsheetmaker`. |
| **Each product gets its own database** (5 Aug 2026) | So any one product can be sold, handed over or deleted without untangling a shared `User` table. Accepted cost: no shared login, and Stripe/admin/email exist once per app. See [`packages/core/README.md`](../packages/core/README.md). |
| **Shared code takes the database client as an argument** | It's what lets `auth`, `billing` and `plans` be shared *code* despite separate databases. Nothing in `packages/core` may import a Prisma client. |
| **Every app has a dev database of its own** (5 Aug 2026) | Four in total: production and dev, per product. Local development no longer writes to production. Each dev database starts as a snapshot, so it drifts — recreate it when it gets too stale, and keep its auto-delete set to Never. |
| **Product 2 is RecipeBookMaker, at recipebookmaker.com** (5 Aug 2026) | Descriptive names are what make this family rank — the best-performing ad keywords for ChordSheetMaker were literally "chord chart maker". "CookbookMaker" was rejected: cookbookmaker.com is a funnel domain for Morris Press Cookbooks, an established US keepsake-cookbook printer, so the name was unwinnable in the default TLD. The workspace folder is still `apps/recipemaker`. |
| **Setlists & collections are free** | Organising is what makes someone come back and accumulate songs — it feeds the 5-song limit rather than competing with it. The API never gated it; the pricing table was the thing that was wrong. |
| **Guests are first-class** | The whole editor works with no account. The demo path *is* the funnel; asking for signup before value is what loses people. |
| **Emails stay manual for now** | Deliberate: the founder reads the replies. Automation is the obvious next step, and `suggestNextTemplate()` + the cooldown already encode the logic. |
| **Share links are detached snapshots** | A link keeps working after the song changes — but there's no owner recorded, so shares can't be listed or revoked. Adding `userId` would fix that. |

## Next up (rough priority)

1. **Automate the lifecycle emails.** Especially a day-0 welcome and an
   automatic nudge the moment someone hits the 5-song limit — the hottest
   moment in the funnel currently depends on the founder noticing.
2. **Give free users a taste of Pro** — one watermarked PDF, one share link.
   People don't buy what they've never felt.
3. **Audit the paywall moments** (6th song, PDF, share): each should show the
   benefit, the price, "7 days free, no charge today" and a one-click path.
4. ~~**Feed conversions back to Google Ads.**~~ **Done 4 Aug 2026, and made the
   Primary action 20 Aug 2026** — but read the warning under Watchpoints before
   trusting any historic conversion number. `trackSignUp()` reports a real Ads
   conversion, gated on
   `NEXT_PUBLIC_ADS_SIGNUP_LABEL`. Note this is for *measurement*: the budget
   will not produce the ~15–30 conversions/month that conversion-based bidding
   needs, so the goal is knowing which keywords produce users, not Smart
   Bidding.
5. **Replace the placeholder testimonial.** "Emma Larson" on the landing page is
   invented. There are real customers now — the 💬 *Feedback ask* email exists
   precisely to collect a usable quote.
6. **Give people a reason to return** — e.g. play-through-a-setlist (prev/next
   in play mode, which doesn't exist yet), or PWA install so the app lives on
   the tablet home screen.

## Watchpoints

- **Every Google Ads "conversion" before 20 Aug 2026 is fictional.** The Primary
  action was `Sign-up (Page load welcome=1)`, which fires on any page load whose
  URL contains `welcome=1` — and the only place the app produces that URL is
  the CTA buttons on the `[slug]` landing pages, shown to everyone, logged in
  or not. It counted button clicks, not signups, from April onwards. **Fixed 20
  Aug 2026**: `Sign-up (account created)` is now the goal's only Primary action
  and the old one is Secondary — demoted, not deleted, so the history stays
  comparable. Don't read any month before that as real.
- **The old `welcome=1` action recorded zero conversions in the 30 days to 19
  Aug**, despite 135 campaign clicks in July. Unconfirmed hypothesis: the
  `ChordSheetMaker-Search-Jul2026` relaunch points its ads somewhere other than
  a `[slug]` landing page, so nobody passes a CTA that appends `?welcome=1`.
  Check the ads' Final URL to settle it. Harmless either way now that the
  action is Secondary, but the same mechanism could hide a real problem.
- **`NEXT_PUBLIC_*` vars are baked in at build time.** Adding one in Vercel
  does nothing until a build runs *after* it exists; a redeploy triggered
  before adding the value ships a silent no-op. Verify by checking the value
  appears inlined in the served JS, not as a `process.env` lookup.
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
| Platform / multi-product architecture | [`packages/core/README.md`](../packages/core/README.md) — what may be shared, what may not, and why |
| How the whole system fits together | [`ChordSheetMaker-System-Overview.md`](../ChordSheetMaker-System-Overview.md) — incl. exact Mermaid diagrams |
| A visual walkthrough / presentation | `/tour` on the site, or [`public/tour/index.html`](../public/tour/index.html) |
| Product positioning and ideas | [`ChordSheetMaker-Brief.md`](../ChordSheetMaker-Brief.md) |
| Poster naming & regeneration | [`docs/posters.md`](posters.md) |
| Live numbers, users, activity | `/admin` |
