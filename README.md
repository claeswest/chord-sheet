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

## Everyday commands

```bash
npm run dev            # dev server
npm run build          # production build (run before pushing anything risky)
npx tsc --noEmit       # typecheck
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

## Other docs in this repo

- **[`docs/status.md`](docs/status.md) — start here in a new session.** What was
  learned, what was decided and why, and what's worth doing next.

- `ChordSheetMaker-Brief.md` — product brief: positioning, audience, pricing, roadmap
- `APPLE_SIGNIN_SETUP.md` — how to obtain the Apple client id/secret (secret expires ≤6 months)
- `AGENTS.md` / `CLAUDE.md` — note for AI coding assistants: this Next.js version differs
  from what models were trained on; read `node_modules/next/dist/docs/` before using new APIs
