# ChordSheetMaker — System Overview & Infographic Briefs

Two things in one document:

1. **Part 1** — a comprehensive plain-language description of the whole system
   (product, tech stack, architecture, data, money, growth machinery).
2. **Part 2** — ready-to-paste prompts for an AI image generator, one per
   infographic, so the system can be grasped visually.

> **Read this before using Part 2:** AI *image* generators (Midjourney, DALL·E,
> Imagen, Ideogram…) draw the *impression* of an infographic. They routinely
> misspell labels, invent extra boxes and mis-wire arrows. They are great for a
> poster that *feels* like your system and useless as a reference diagram.
> Each prompt below is therefore written to keep text short and boxes few.
> Ideogram and GPT-Image render text most reliably; Midjourney looks best but
> garbles words the most. For a diagram that is technically *correct*, generate
> Mermaid/SVG from Part 1 instead.

---

# PART 1 — The system in words

## 1. What the product is

ChordSheetMaker (chordsheetmaker.ai) turns any song into a **chord chart**: the
lyrics with chord symbols sitting exactly above the syllable where the chord
changes. A musician can get a chart in seconds, make it beautiful, transpose it
to their key, and then play it hands-free while the page auto-scrolls.

The audience is deliberately two-sided: **gigging musicians, worship teams and
cover bands** on one side, **hobby players at home** on the other ("from sofa to
stage"). Solo founder, live product, real paying customers.

## 2. What a user can actually do

**Get a song in (four ways)**
- **AI search** — type title + artist; AI returns a formatted chart
- **Photo import** — photograph a printed or handwritten sheet; AI OCR reads it
- **Paste** — paste text/chords from any website; AI cleans up the formatting
- **From scratch / template** — write it manually or start from a song skeleton

**Shape it**
- Drag any chord to the exact syllable; add/remove chord and section lines
- Transpose the whole chart up/down a semitone at a time (free for everyone)
- Style it: page colour, fonts, sizes, colours — or let AI style it
- **AI background image**: the AI reads the lyrics and paints a matching scene;
  the AI text styling picks fonts and colours to match the song's mood
- Organise songs into **setlists & collections** (folders, drag to reorder)

**Use it**
- **Play mode**: large readable type, auto-scroll at 20 speed steps, screen kept
  awake, "lyrics only" toggle for singers who don't need chords
- **PDF export**: print-ready, chords stay aligned, section headers never get
  stranded at a page break
- **Share link**: a public URL anyone can open and play — no account needed

## 3. Accounts, tiers and money

- **Guest** — no account. Songs are saved in the browser (localStorage). On
  signup, guest songs migrate into the account automatically.
- **Free** — 5 songs, transposition, setlists & collections, AI features.
- **Pro** — unlimited songs, PDF export, share links, priority support.
  **$9/month or $79/year (≈$6.60/mo)**, both starting with a **7-day free trial**.

Payments run through **Stripe** (checkout + customer portal). A Stripe webhook
keeps subscription status in sync, so trials, renewals, cancellations and
failed payments all flow back into the database automatically.

## 4. Tech stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js (App Router)**, React, TypeScript |
| Styling | **Tailwind CSS v4** |
| Database | **PostgreSQL on Neon** (serverless) via **Prisma** |
| Auth | **NextAuth v5** — Google, GitHub, Apple, Resend magic links |
| AI | **Google Gemini** — song search, chart parsing, photo OCR, background image generation, text styling |
| Email | **Resend** — magic links + admin-triggered marketing |
| Payments | **Stripe** — subscriptions, trials, webhooks |
| Analytics | **GA4** + a self-built activity log in Postgres |
| Hosting | **Vercel** — push to `master` deploys production |
| Client-side | canvas text measurement for chord placement, html2canvas + jsPDF for PDF, localStorage for guests |

Scale of the codebase: **~116 TypeScript/TSX files, ~17,000 lines**, 26 API
routes, 16 app pages plus 13 SEO landing pages generated from data.

## 5. Code architecture

Three layers, plus the database and outside services.

**Routes (`src/app/`)** — App Router. Server components fetch data; client
components handle interaction.
- Marketing: `/` landing, `/pricing`, `/terms`, `/[slug]` (13 SEO landing pages
  built from a data file — e.g. worship teams, choirs, cover bands)
- Product: `/editor/new` (the editor), `/songs` (library), `/view` (play mode)
- Public: `/share/[token]` (shared chart, playable by anyone)
- Admin: `/admin` dashboard, `/admin/users`, `/admin/activity`
- Auth/account: `/login`, `/account`, `/unsubscribe`
- `src/app/api/*` — 26 endpoints grouped as: `songs`, `categories`, `share`,
  `ai/*` (search, parse, ocr, background, style), `stripe/*` (checkout, portal,
  webhook), `admin/*`, `activity`, `me/entitlements`, `unsubscribe`

**Components (`src/components/`)**
- `editor/` — `SongEditor` (the workbench), `SongViewer` (play mode),
  `StylePanel` (fonts/colours/AI styling), `ImportModal` (the four input paths),
  `PrintView` (PDF layout), chord/line editing pieces
- `library/` — `SongLibraryPage`: song list, categories sidebar, drag & drop
- `admin/`, `ui/`, `viewer/`, `analytics/`

**Domain logic (`src/lib/`, 23 modules)** — the interesting part, kept out of
components: `parseChordSheet` (text → structured chart), `transpose`,
`chordFormat`, `songStyle`, `pdfExport`, `plans` (the single source of truth for
what each tier includes), `activity` (event logging with 30-minute throttling),
`marketing` (7 email templates + unsubscribe tokens), `gemini`, `stripe` +
`stripeSync`, `auth`, `prisma`, `storage` (guest localStorage), `rateLimit`.

**Key design decisions worth showing**
- A song is one database row whose `content` is JSON: `lines`, `style`, `tags`,
  `semitones`. Each lyric line carries chords as `{chord, position}` where
  position is a character index — the renderer measures actual text width on a
  canvas to place chords pixel-perfectly above the right syllable.
- `plans.ts` defines tier features once; pricing tables, paywalls and API gates
  all read from it, so marketing and enforcement cannot drift apart.
- Guests are first-class: the whole editor works with no account, backed by
  localStorage, and migrates on signup.

## 6. Data model (9 tables)

- **User** — profile, plan, Stripe ids, marketing opt-out, last-email timestamp
- **Account / Session / VerificationToken** — NextAuth (OAuth links, sessions, magic links)
- **Song** — title, artist, `content` JSON (lines + chords + style), owner, order
- **Category** — setlists/collections; supports sub-categories (parent id)
- **SongCategory** — join table, songs ↔ categories, with ordering
- **Share** — a public token plus a snapshot of the chart at share time
- **ActivityLog** — every notable event: account created, login, song created /
  opened / edited, chord added, style changed, AI background, AI styling, PDF
  exported, song imported, subscription started/changed/ended, marketing email.
  Noisy events collapse to one row per song per 30 minutes, counting repeats.

## 7. The growth machinery (how the business runs)

- **Funnel**: ad or search → landing page → *demo chart without signing up* →
  "keep your songs" prompt → free account → 5-song limit → 7-day trial → paying
- **Activity log → admin**: a live feed of what every user (and every anonymous
  guest, via a per-browser id) does, so the founder can see where people stall
- **Manual email drip** (admin-triggered, 3-day cooldown per user):
  welcome tips → AI magic → photo rescue → band sharing → upgrade nudge →
  feedback ask, plus a situational win-back. Every mail carries a signed
  one-click unsubscribe and BCCs the founder.
- **Share loop**: every shared chart shows logged-out viewers a "Make your own —
  free" CTA — bandmates are the warmest possible leads
- **SEO**: 13 use-case landing pages generated from a single data file

---

# PART 2 — Infographic prompts

Six posters. Each is standalone — paste one prompt at a time. Shared style so
the set looks like a family:

> **House style (already baked into each prompt):** flat vector infographic,
> deep indigo/violet gradient background (#0f0c29 → #302b63), white and light
> lavender text, indigo #6366f1 and violet #8b5cf6 accents, soft glows, rounded
> rectangles, thin connecting lines with small arrowheads, generous negative
> space, modern geometric sans-serif, subtle music motifs (chord symbols, a clef,
> a play triangle). No photorealism, no clutter, no drop shadows on text.

**Tips:** ask for the exact aspect ratio you need (16:9 for slides, 4:5 for
posts); if labels come out garbled, regenerate with *fewer* labels; you can
always add correct text afterwards in any design tool.

---

### 1. System architecture — how the pieces connect

```
Flat vector technical infographic poster titled "ChordSheetMaker — System
Architecture". Deep indigo-to-violet gradient background, white and lavender
text, glowing indigo and violet accents, rounded rectangle nodes connected by
thin lines with small arrowheads. Left column: three small device icons labeled
"Phone", "Tablet", "Laptop". Center: one large glowing rounded box labeled
"Next.js App on Vercel" containing three stacked smaller bars labeled "Pages",
"API Routes", "Domain Logic". Right column: four separate service cards in a
vertical stack, each with a simple icon, labeled "Neon Postgres", "Google
Gemini AI", "Stripe", "Resend Email". Arrows flow left to right from devices to
the center box, and from the center box to each service card. Bottom strip: a
thin bar labeled "GitHub push to master deploys to Vercel". Modern geometric
sans-serif, flat design, generous negative space, no photorealism, 16:9.
```

### 2. From song to stage — the creation pipeline

```
Flat vector process infographic titled "From Song to Stage". Deep indigo-violet
gradient background, white text, indigo and violet glowing accents. A left-to-
right pipeline in four stages connected by arrows. Stage 1 is a vertical group
of four small cards labeled "AI Search", "Photo", "Paste", "Blank", each with a
simple icon (magnifier, camera, clipboard, pencil). Stage 2 is a single glowing
box labeled "AI builds the chart" showing a tiny stylized chord sheet with
chord symbols above lyric lines. Stage 3 is a box labeled "Make it yours" with
three small chips beneath it labeled "Style", "Transpose", "Align". Stage 4 is a
group of three outcome cards labeled "Play", "PDF", "Share". A large play
triangle glows at the far right. Musical note motifs float faintly in the
background. Modern geometric sans-serif, flat design, clean, 16:9.
```

### 3. Tech stack

```
Flat vector "tech stack" infographic poster titled "ChordSheetMaker Tech Stack".
Deep indigo-violet gradient background, white and lavender text, neon indigo
accents. Five horizontal layered bands stacked like a cake, each a rounded
rectangle with a label on the left and 2-3 small logo-style icon circles on the
right. From top to bottom the bands are labeled: "Frontend — Next.js, React,
TypeScript, Tailwind", "Backend — API Routes, Prisma", "Data — Neon Postgres",
"AI — Google Gemini", "Services — Stripe, Resend, Vercel". Each band glows
slightly brighter than the one below. Thin vertical connector lines join the
bands down the middle. Minimal, elegant, lots of empty space, modern geometric
sans-serif, flat design, 4:5 vertical poster.
```

### 4. Code architecture — how the repo is organised

```
Flat vector software architecture diagram titled "Code Architecture". Deep
indigo-violet gradient background, white text, indigo and violet accents, thin
connecting lines. Four horizontal tiers stacked vertically, each tier a wide
rounded rectangle containing three small boxes. Top tier labeled "Routes" with
boxes "Landing", "Editor", "Admin". Second tier labeled "Components" with boxes
"Editor", "Library", "UI". Third tier labeled "Domain Logic" with boxes
"Parsing", "Styling", "Plans". Bottom tier labeled "Data" with boxes "Prisma",
"Postgres", "Storage". Arrows point downward between tiers. A small side note
box on the right labeled "116 files, 17k lines". Blueprint feel, flat design,
technical and calm, modern geometric sans-serif, 16:9.
```

### 5. Data model

```
Flat vector database schema infographic titled "Data Model". Dark indigo-violet
gradient background, white text, glowing indigo table cards connected by thin
lines. Center: a large rounded card labeled "User". Around it, five smaller
rounded cards labeled "Song", "Category", "Share", "ActivityLog", "Session",
connected to the center card by thin lines with small dots at each end. Each
card shows two or three tiny placeholder text rows beneath its title to suggest
columns. Clean entity-relationship style, evenly spaced radial layout, plenty of
dark negative space, flat design, modern geometric sans-serif, no clutter, 1:1
square.
```

### 6. Growth funnel

```
Flat vector conversion funnel infographic titled "Visitor to Musician". Deep
indigo-violet gradient background, white text, glowing violet and pink accents.
A wide funnel shape running from top to bottom, divided into five horizontal
bands, each labeled inside: "Visitor", "Tries a chart", "Free account",
"5 song limit", "Pro subscriber". The funnel narrows toward the bottom where a
small glowing star or crown sits. To the right of the funnel, three small
floating cards with arrows pointing back into it, labeled "Share link",
"Email", "Search". Subtle music note motifs in the background. Elegant, modern,
flat design, geometric sans-serif, 4:5 vertical poster.
```

---

## Optional seventh: a single "everything" poster

```
Flat vector one-page overview poster titled "ChordSheetMaker". Deep indigo-
violet gradient background, white and lavender text, glowing indigo accents.
Four quadrants separated by thin faint lines, each with a small heading and 3
simple icons: top-left "Create" (magnifier, camera, clipboard), top-right
"Style" (paint palette, font letter A, image), bottom-left "Play" (play
triangle, phone, PDF page), bottom-right "Organise" (folder, list, share link).
In the exact center, a glowing circular badge with a treble clef. Balanced,
symmetrical, poster-like, flat design, modern geometric sans-serif, lots of
negative space, 1:1 square.
```
