# ChordSheetMaker

AI chord-sheet app for musicians — [chordsheetmaker.ai](https://chordsheetmaker.ai)

Search any song (or photograph a paper sheet) and get a chord chart with the chords
sitting exactly above the right syllables. Style it with AI backgrounds and fonts,
transpose it, then play it hands-free with auto-scroll. Free tier + Pro subscription
(Stripe), Google/GitHub/Apple/email sign-in, and an admin area for user and activity
insight.

## Stack

| Piece | What |
| --- | --- |
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL on [Neon](https://neon.tech) via Prisma (`@prisma/adapter-neon`) |
| Auth | NextAuth v5 (Google, GitHub, Apple, Resend magic links) |
| AI | Google Gemini (song search/parse, OCR photo import, background images) |
| Email | [Resend](https://resend.com) (magic links + marketing) |
| Payments | Stripe (monthly/yearly, 7-day trial) |
| Hosting | Vercel — pushing to `master` deploys production |

## Setting up on a new machine

This is an npm-workspaces monorepo. Install from the **root** — that installs
every app and package at once.

```bash
git clone https://github.com/claeswest/chord-sheet.git
cd chord-sheet
npm install          # also runs `prisma generate` via postinstall
```

Then create the environment file — **this is the only part git can't give you**
(secrets are gitignored, and they must never be committed). It belongs in the
**app** directory, not the repo root, because that's the directory `next` runs in.

**Recommended — pull them from Vercel:**

```bash
npx vercel login
npx vercel link
npx vercel env pull apps/chordsheetmaker/.env
```

**Or** copy `.env` from the old machine through something secure (password manager,
USB stick). Not email or chat.

⚠️ **After pulling, fix one value.** `vercel env pull` fetches the *production*
values, so `AUTH_URL` arrives as the live domain and sign-in will bounce you
there instead of localhost. Edit `apps/chordsheetmaker/.env`:

```
AUTH_URL=http://localhost:3000
```

Finally:

```bash
npm run dev
```

Then open **`http://localhost:3000`** — type the `http://` explicitly. Browsers
silently upgrade a bare `localhost:3000` to HTTPS, and `next dev` serves plain
HTTP, which shows up as *"The site can't provide a secure connection"*. If that
sticks, clear it at `chrome://net-internals/#hsts` → *Delete domain security
policies* → `localhost`, or just use `http://127.0.0.1:3000`.

Requires **Node 20+** (developed on 22.14, npm 10.9).

Verified path: a fresh `git clone` + `npm install` alone is enough for
`npx tsc --noEmit` to pass — `postinstall` generates the Prisma client for you.
`.env` is the only thing you have to bring yourself.

### Google sign-in on localhost

For OAuth to work locally, `http://localhost:3000/api/auth/callback/google` must be
listed as an authorized redirect URI in the Google Cloud console for the client id
you're using. Same idea for GitHub.

## Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | everything | Neon connection string. **See the warning below.** |
| `AUTH_SECRET` | auth, unsubscribe links | Any long random string; also signs email unsubscribe tokens, so changing it invalidates links in already-sent emails |
| `AUTH_URL` | auth | `http://localhost:3000` locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in | optional |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple sign-in | optional — the button hides itself when unset |
| `GEMINI_API_KEY` | AI song search, photo OCR, AI backgrounds | without it those endpoints return a clear 500 |
| `RESEND_API_KEY` | magic-link + marketing email | without it email sign-in and admin emails are disabled |
| `EMAIL_FROM` | email sender | e.g. `ChordSheetMaker <hello@chordsheetmaker.ai>`; falls back to Resend's shared sender, which only delivers to the Resend account owner |
| `ADMIN_EMAILS` | `/admin` access | comma-separated; also the BCC/notification recipients and the "exclude my own activity" filter |
| `CRON_SECRET` | the daily email job (`/api/cron/drip`) | any long random string, set in Vercel — Vercel Cron sends it by itself. **Without it the job answers 503 and no automatic email goes out.** Locally the job only ever does a dry run |
| `MCP_SECRET` | the owner's MCP server (`/api/mcp`) | any random string of 32 characters or more, e.g. `openssl rand -hex 32`. **Without it the endpoint answers 503.** Whoever holds it can read the site's numbers and add songs to the owner's library, so it is a password: set it in Vercel, never in a file that is committed |
| `MCP_USER_ACCESS` | letting customers connect an AI app to their own songs | `on` switches it on. **Off by default, and it must stay off until the three tables exist in that database** — see "The MCP server" below |
| `STRIPE_SECRET_KEY` | checkout | |
| `STRIPE_WEBHOOK_SECRET` | subscription status | |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` / `STRIPE_PRICE_LIFETIME` | plans | price ids |
| `NEXT_PUBLIC_GA_ID` | GA4 analytics | optional; analytics no-op without it |
| `NEXT_PUBLIC_ADS_SIGNUP_LABEL` | Google Ads conversion tracking | the label after the slash in `send_to: 'AW-1064389018/<label>'`; **without it Ads records zero conversions and Search bids blind** |
| `ERROR_WEBHOOK_URL` | error alerts | optional |

## Databases: four of them

Each product has its own database, and each has a separate one for development —
so `npm run dev` never touches live data, for either app:

| | ChordSheetMaker | RecipeBookMaker |
| --- | --- | --- |
| Production | own database | own database |
| Local dev | own database | own database |

`DATABASE_URL` lives in each app's own `.env`; the production values are set in
Vercel and nowhere in this repo. The dev databases start as snapshots, so they
drift from production over time — recreate one when it gets too stale, and keep
its auto-delete set to Never.

Test signups and test recipes therefore stay out of the live admin feed. What is
*not* separate is everything outside the database: Stripe (unless test keys are
used locally), Resend, and any AI provider all hit the real service.

## What checks a push

Every push to `master` is deployed by Vercel, and separately built and typechecked
for all three apps by GitHub Actions (`.github/workflows/ci.yml`). The two do not
wait for each other: a red run is a warning that something already went out, or
failed to. It also runs the unit tests (`npm test`), of which there are only a few so
far. A test sits beside what it tests, as `<file>.test.ts`.

ChordSheetMaker also has browser tests (`apps/chordsheetmaker/e2e`, Playwright): a
real Chromium opens the built app and does what a visitor without an account can
do — open the public pages, write and save a song, find it in the library, play
it. They run in the same GitHub Actions job, after the build. They do not sign in,
pay or use the AI: the test server is started without a database and without keys,
and the browser is kept from every site but the app itself, so a run is not a
visit in Analytics either. `e2e/fixtures.ts` is where that is decided; read it
before adding a test. Like the rest of that job they report and do not stop a
release.

To run them on your own machine, Playwright's browser has to be downloaded once
(`npx playwright install chromium`, kept outside the repository). Without it every
test fails at once with "Executable doesn't exist".

One thing does stop a release: ChordSheetMaker's build runs its unit tests first
(`vitest run && next build`). A failing test fails the Vercel build, and Vercel
keeps serving the version that was already live. Results: the Actions tab of the repository.

## Everyday commands

```bash
npm run dev            # dev server
npm run build          # production build (run before pushing anything risky)
npx tsc --noEmit       # typecheck
npm test               # unit tests (Vitest)
npm run e2e            # browser tests (Playwright); needs `npm run build` first
npm run e2e:watch      # the same, slowly, in a window you can watch
npm run e2e:ui         # Playwright's window: pick a test, step through it
npx playwright install chromium   # once per machine, before the first `npm run e2e`
npm run lint           # eslint
npx prisma studio      # browse/edit the database in a GUI
npx prisma db push     # apply schema.prisma changes (additive changes are safe)
npx prisma generate    # regenerate the client if types look stale
```

Deploy = `git push` to `master`. Vercel builds and promotes automatically.

## Gotchas

- **`.next` EPERM on Windows** — if a build fails with a permission error, delete the
  folder first: `rm -rf .next && npm run build`.
- **Prisma client is gitignored** (`/src/generated/prisma`), so a fresh clone must run
  `npm install` (which triggers `prisma generate`) before typechecking will pass.
- **Canonical domain is non-www.** Stripe webhook URLs must point at
  `https://chordsheetmaker.ai/...` — the www variant 308-redirects and Stripe does not
  follow redirects. This silently broke trial→active updates once: every delivery
  failed with a 308 and subscription data went stale. `src/lib/stripeSync.ts` now
  self-heals by reconciling with Stripe when a stored period end has passed, but
  webhooks are still the primary path — when subscription state looks wrong, check
  **Stripe Dashboard → Webhooks → deliveries** first.
- **Never commit `.env`.** If a key leaks, rotate it in the provider *and* in Vercel.

## Layout

```
apps/chordsheetmaker/         the app — everything below is relative to it
  src/app/                    routes: landing, editor, /songs, /share/[token], /admin, /api/*
  src/components/             editor (SongEditor, SongViewer, StylePanel), library, ui
  src/lib/                    prisma, auth, plans/entitlements, activity log, marketing email,
                              song parsing & styling, pdf export, analytics
  prisma/schema.prisma
  public/examples/            landing-page screenshots of the three public example sheets
  .env                        secrets live here, not at the repo root

packages/                     code shared between apps (see docs/platform.md)
docs/                         status, platform analysis, posters
```

The repo is an npm-workspaces monorepo so a second product can be added without
copying infrastructure. Run npm commands from the **root**; they delegate to the
app. `npm run dev`, `npm run build`, `npm run typecheck` all work from there.

Admin lives at `/admin` (dashboard, users, activity) and is gated by `ADMIN_EMAILS`.

## The MCP server

ChordSheetMaker has an MCP server at `/api/mcp`, so an AI client such as Claude
or ChatGPT can work with the app directly. It has two doors:

- **The owner's key** (`MCP_SECRET`). No sign-in; it acts as the account of the
  first address in `ADMIN_EMAILS` and is the only way to the site's numbers.
- **A person's own sign-in**, while `MCP_USER_ACCESS` is `on`. They add the
  address `https://chordsheetmaker.ai/api/mcp` in their AI app, are sent to the
  site to sign in, and press Allow. The app then works on their songs and
  nothing else, until they press Disconnect on `/account`.

| Tool | Who | What it does |
|---|---|---|
| `site_numbers` | owner only | accounts, songs, subscriptions, the funnel, AI use, the email job, trends. Counts only, never a name or an address |
| `list_songs` | both | the songs in the caller's library |
| `get_song` | both | one of them as text, chords in brackets: `[Am]Hello [G]world` |
| `create_song` | both | adds a song from text in that same format. The plan's song limit applies, as in the editor |

Nothing deletes or overwrites. The tools are in `src/lib/mcpServer.ts` and the key
check in `src/app/api/mcp/route.ts`; read the comments in both before adding a tool.

The sign-in is OAuth 2.1 as the MCP specification asks for it, with the site as
its own authorization server:

| Where | What |
|---|---|
| `src/lib/oauth.ts` | the rules, with no database or network, and their tests beside it |
| `src/lib/appClients.ts` | finding out who an app is |
| `src/lib/connectedApps.ts` | what is stored: codes, and keys as hashes only |
| `/.well-known/oauth-*` | the two documents an app reads to find its way |
| `/oauth/authorize` | the Allow page |
| `/api/oauth/decision`, `/token`, `/register` | what the page posts to, where an app collects its keys, and registration for older apps |

**To switch it on in production**, in this order: create the tables
(`npx prisma db push` with production's `DATABASE_URL`; the change only adds
three tables), then set `MCP_USER_ACCESS=on` in Vercel and redeploy. Which plans
may connect an app is `aiApps` in `plans.ts`.

To connect Claude Code, with the key in an environment variable so that it is
never written into a file:

```bash
claude mcp add --transport http chordsheetmaker https://chordsheetmaker.ai/api/mcp   --header "Authorization: Bearer $CHORDSHEETMAKER_MCP_KEY"
```

Locally the address is `http://localhost:3000/api/mcp` and the key is the
`MCP_SECRET` in `apps/chordsheetmaker/.env`, which talks to the dev database.

## Other docs in this repo

- **[`docs/status.md`](docs/status.md) — start here in a new session.** What was
  learned, what was decided and why, and what's worth doing next.

- `ChordSheetMaker-Brief.md` — product brief: positioning, audience, pricing, roadmap
- `APPLE_SIGNIN_SETUP.md` — how to obtain the Apple client id/secret (secret expires ≤6 months)
- `AGENTS.md` / `CLAUDE.md` — note for AI coding assistants: this Next.js version differs
  from what models were trained on; read `node_modules/next/dist/docs/` before using new APIs
