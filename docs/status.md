# Project status — pick-up notes

*Last updated: 21 August 2026*

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

RecipeBookMaker is live at [recipebookmaker.com](https://recipebookmaker.com)
and is no longer a sketch. As of 21 August 2026 it has: Stripe checkout and
billing on its own products and prices, a customer portal, subscription
webhooks, admin notifications on new and departing subscribers, a read-only
`/admin` (overview, people, activity) modelled on ChordSheetMaker's,
collections, AI import from text and photographs, a second-pass checker that
proposes quantity corrections, per-recipe AI styling and illustration, PDF and
print, share links, an automated trial-email sequence, a favicon and a social
card. Its own dev database, its own Neon project, its own Vercel project.

The two apps now share real code through `@clavos/core`: billing state,
admin notifications, the customer-email shell, unsubscribe tokens and the
build stamp. Auth, plans and the domain models remain deliberately separate —
see `packages/core/README.md` for what may be shared and why.

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

## What the data said (analysis, 21 August 2026)

First look at GA4's own funnel rather than the activity log, for the 28 days to
19 August. It corrected two things this document had assumed.

1. **The landing page is not the leak.** Of the visitors in that window, 46%
   clicked "Try it free", 70% of those started the demo, and around half of
   *those* got as far as saving a song. That is a healthy top of funnel, and
   flatly contradicts the guess that people read the page and leave.
2. **The leak is the ask.** Roughly fifty people saved something. The banner
   reminder reached about forty of them. The one-time "keep your song" modal —
   the moment the code itself calls the strongest signup moment — reached
   **five**. Eleven accounts were created. See the fix below.
3. **Paid search produced one attributable signup out of eleven**, for a full
   month of budget, while paid traffic was roughly a third of all visits. An
   even split would have given three or four. The gap is the size attribution
   loss usually explains, so this is not yet proof the ads are bad — only proof
   they are unmeasured. The GA4 key-event switch under Watchpoints decides it.
4. **`page_view` was only ever sent on a full page load**, so GA4 saw one page
   per visit and every session looked like a single-page visit. Any earlier
   read of in-app behaviour from GA4 is worthless. Fixed 20 August; the clock
   starts there.

## What was built in response (August 2026)

- **The "keep your song" modal now fires when a guest presses Save, and when
  the tab is hidden** — the two moments where the loss is real. It previously
  waited three unbroken minutes of idling, which is why it reached a tenth of
  the people who had built something. It also now requires a named song with a
  line, or two lines without a name: the modal is a one-shot, and "not empty"
  let a single keystroke spend it forever.
- **RecipeBookMaker trial emails** — tips on day one or two, and a service
  message two days before the first charge. Daily Vercel cron behind
  `CRON_SECRET`, idempotent through the activity log, windows overlapping so a
  drifting cron can't skip anyone. See `src/lib/trialEmails.ts`.
- **Route-change `page_view`**, which also revived the mid-funnel Ads
  measurement that had silently read zero since the CTAs became `<Link>`s.

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
| **RecipeBookMaker prices in USD** (Aug 2026) | Matches ChordSheetMaker, which also settles in SEK behind the scenes. A price's currency is fixed once created in Stripe, so this is not a decision that can be revisited cheaply. |
| **The trial "ending" email ignores marketing opt-out** (Aug 2026) | It states a date and an amount for a subscription someone entered into, which makes it a service message, not a pitch. It carries no unsubscribe link for the same reason. The tips email is marketing and obeys the opt-out normally. |
| **Trial emails are idempotent through the activity log** (Aug 2026) | Each writes its own event type and anyone who already has it is skipped, so the job is safe to run twice — a retried cron, a manual poke, two overlapping deploys. It is also why the send windows can safely overlap. |

## Next up (rough priority)

1. **Watch what the keep-modal fix did**, before building anything else on top
   of a guess. The number to read is `guest_keep_modal` (shown) against
   `sign_up` in GA4. If "shown" climbs from five towards forty and the roughly
   one-in-four conversion holds, accounts roughly double — and nothing else on
   this list is worth as much per line of code.
2. **Decide the ad budget.** A month of spend produced one attributable signup
   while ten arrived from elsewhere. Do the GA4 key-event switch first
   (Watchpoints), because it decides whether that one is the truth or an
   artefact — but do not leave the question open for another month.
3. **Give free users a taste of Pro** — one watermarked PDF, one share link.
   People don't buy what they've never felt.
4. **RecipeBookMaker's own funnel is unmeasured.** ChordSheetMaker has an
   activity log, GA4 events and a paid channel to argue about. The recipe app
   has an activity log and nothing else. It also has no landing-page
   instrumentation and no lifecycle email for people who never subscribe.
5. **Audit the paywall moments** (6th song, PDF, share): each should show the
   benefit, the price, "7 days free, no charge today" and a one-click path.
6. **Replace the placeholder testimonial.** "Emma Larson" on the landing page is
   invented. There are real customers now — the 💬 *Feedback ask* email exists
   precisely to collect a usable quote.
7. **Give people a reason to return** — e.g. play-through-a-setlist (prev/next
   in play mode, which doesn't exist yet), or PWA install so the app lives on
   the tablet home screen.
8. **Automate ChordSheetMaker's lifecycle emails** — a day-0 welcome, and a
   nudge when someone hits the free limit. Deliberately demoted on 21 August
   2026: this sat at number one for a month on the assumption that the people
   existed to email. Eleven accounts in 28 days is not where the leverage is,
   and the machinery to send them now exists in `@clavos/core` whenever the
   numbers justify it. Fix the ask before automating the follow-up.

**Done, but read the caveat:**

- ~~**Feed conversions back to Google Ads.**~~ **Done 4 Aug 2026, and made the
   Primary action 20 Aug 2026** — but read the warning under Watchpoints before
   trusting any historic conversion number. `trackSignUp()` reports a real Ads
   conversion, gated on
   `NEXT_PUBLIC_ADS_SIGNUP_LABEL`. Note this is for *measurement*: the budget
   will not produce the ~15–30 conversions/month that conversion-based bidding
   needs, so the goal is knowing which keywords produce users, not Smart
   Bidding.

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
- **RecipeBookMaker's cron refuses to run without `CRON_SECRET`.** That is
  deliberate — an unauthenticated endpoint that emails customers is a spam
  cannon with your own domain on it — but it means a missing variable looks
  exactly like a job that simply never fires. `/api/cron/lifecycle` answers
  503 when the variable is absent and 401 when it is present and you didn't
  bring it, which is how to tell the two apart from outside.
- **Cron on Vercel's Hobby plan has an hour of jitter.** The trial-email
  windows overlap rather than tile because of it; see the note in
  `daysBeforeCharge()`. Anything else scheduled here must not assume a punctual
  clock either.
- **The social card reads its fonts from disk at request time.** The path is
  built at runtime, so nothing traces it, and `next.config.ts` names the
  `assets` folder explicitly. The only symptom of getting this wrong is a share
  card in the wrong typeface — no build, test or typecheck will notice.
- **`NEXT_PUBLIC_*` vars are baked in at build time.** Adding one in Vercel
  does nothing until a build runs *after* it exists; a redeploy triggered
  before adding the value ships a silent no-op. Verify by checking the value
  appears inlined in the served JS, not as a `process.env` lookup.
- **The founder's own test subscription** converts like any other — check
  `/admin/users` so you aren't paying yourself.
- **Trials convert 7 days after signup.** Worth a personal email during the
  trial week; new subscribers are the best source of real testimonials.
- **Nobody has checked whether `sign_up` is a key event in GA4.** Until it is,
  Traffic acquisition shows sessions per channel but no signups per channel —
  so the obvious question can't be answered: of the 11 signups in the 28 days
  to 19 Aug 2026, Ads could attribute only 1. The other 10 are either genuinely
  other channels, or ad clicks whose attribution was lost to consent, blockers,
  cross-device or the attribution window. Roughly a third of traffic was paid,
  so an even split would have given 3–4 — which is the size of gap attribution
  loss usually explains. Admin → Events, mark it, and a month later the answer
  exists. History can't be recomputed, so the clock starts when it's switched on.
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
| RecipeBookMaker's visual language | [`apps/recipemaker/design/`](../apps/recipemaker/design/) — tokens, canvas spec, component patterns |
| What the trial emails say and when | [`apps/recipemaker/src/lib/trialEmails.ts`](../apps/recipemaker/src/lib/trialEmails.ts) — copy and timing, no database |
| Live numbers, users, activity | `/admin`, on either site — and the build stamp in the admin nav says which commit you are looking at |
