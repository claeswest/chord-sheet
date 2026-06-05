# ChordSheetMaker — Product Brief (for review & improvement)

> Context for the reader: This is a detailed description of a live web app
> (chordsheetmaker.ai). I'm the solo founder. I want your help making the
> product **better and easier to sell** — concrete ideas on positioning,
> conversion, pricing, target audience, growth, and any feature gaps. Please be
> critical and specific. The hard truth so far: traffic is converting very
> poorly (details in the "Traction" section), so I care most about advice that
> moves real users from "visitor" to "paying customer."

---

## 1. What it is (in one paragraph)

ChordSheetMaker is a browser-based web app that turns any song into a clean,
playable **chord sheet** (lyrics with chords positioned above them) and then
helps the musician **perform** it. You type a song title, an AI finds the
chords and lays them out above the lyrics, and you fine-tune everything with
drag-and-drop. When it's time to play, the sheet **auto-scrolls** like a
teleprompter so you can keep both hands on your instrument. It runs entirely in
the browser — nothing to install — and works on laptop, tablet, and phone.

## 2. The problem it solves

Musicians (hobbyists, teachers, students, worship/choir leaders, gigging
players) constantly deal with chord sheets that are:
- Scattered across paper, screenshots, text files, and various websites
- Badly formatted (chords misaligned over lyrics, ad-cluttered web pages)
- Hard to use live (you need free hands to play, can't scroll a paper sheet)
- In the wrong key for their voice (manual transposition is tedious)

ChordSheetMaker centralizes, cleans, and makes these sheets performance-ready.

## 3. Target users (current, loosely defined)

The product is currently marketed broadly to "musicians," but the features map
most strongly to a few personas:
- **Gigging musicians** — want hands-free performance on a phone/tablet on stage.
- **Worship & choir leaders** — need to transpose to a singer's key, share
  charts with a team, and build setlists for services.
- **Music teachers & students** — want to store and practice the songs from
  lessons, organized in one place.
- **Hobbyists & families** — store and accompany songs for fun, gatherings, and
  celebrations (birthdays, Christmas, etc.).

> Note: I have NOT firmly committed to a single niche. This is likely a problem.

## 4. Feature set (detailed)

**Creating a sheet**
- **AI song search**: type a title (and optionally artist); a Google Gemini
  model returns a full chord sheet with chords aligned over the correct
  syllables and sections labelled (Verse, Chorus, etc.). It refuses/says
  "not found" rather than hallucinating obscure songs.
- **Import existing chords**: paste raw text from a chord website (it cleans the
  junk/ads), or **snap a photo** of a printed/handwritten sheet (OCR via Gemini
  vision) and it converts to an editable digital sheet.
- **Templates**: start from common song structures (verse-chorus, blues, AABA).
- **Build from scratch**: type lyrics, then click/drag to place chords.

**Editing**
- **Drag-and-drop chord placement**: position each chord above the exact beat.
- **Chord palette**: pick root + accidental + quality. 12 common qualities plus
  a "More chords" toggle revealing 12 advanced jazz qualities (maj9, m9, 13,
  m7b5, 7b9, 7#9, etc.). Custom chord field for anything unusual (e.g. slash
  chords D/F#).
- **Transpose & capo**: change key with one tap; all chords move with it.
- **Undo/redo, find & replace.**

**Performing**
- **Hands-free auto-scroll**: press play; the sheet scrolls at an adjustable
  speed like a teleprompter.
- **Stage/performance mode** (mobile): larger text, tap-to-play, designed to be
  read from a music stand.

**Styling / presentation**
- **AI styling**: AI picks fonts, colors, and layout to match the song's mood,
  genre, and era — one click.
- **AI background images**: generates atmospheric background art per song.
- **Manual styling**: per-element fonts (≈25 fonts incl. self-hosted jazz
  fonts), sizes, colors, bold/italic, alignment, section dividers, background
  color/image with overlay.
- **Style presets**: one-click looks — Clean, Jazz (Real Book), Modern, Folk,
  Worship, Rock.
- **"Real Book" jazz chord rendering**: optional lead-sheet typography where the
  root is full size and the extensions are raised superscripts (e.g. Eb maj7,
  D7b9), with proper ♭/♯ glyphs — using authentic self-hosted jazz fonts
  (Petaluma Script, MuseJazz Text). Can be applied manually, via the preset, or
  automatically when the AI detects a jazz song.

**Organizing, sharing, exporting**
- Songs saved to the user's account, grouped into **folders/categories** and
  **setlists**.
- **PDF export** (clean, print-ready).
- **Public share links** (view a sheet without an account).
- **Cross-device sync** (build on laptop, perform from phone).
- Guests can build a sheet **without an account** (stored in browser
  localStorage) until they choose to save.

## 5. Tech stack & architecture

- **Framework**: Next.js 16 (App Router), React, TypeScript. Server components,
  statically-generated SEO pages, dynamic routes.
- **Styling**: Tailwind CSS, mobile-first.
- **Database**: PostgreSQL (Neon, serverless) via Prisma ORM.
- **Auth**: NextAuth (sign-in + sessions).
- **AI**: Google Gemini — `gemini-2.5-flash` for text (search, parse, OCR,
  styling) and `gemini-2.5-flash-image` for background generation. Centralized
  client with timeout + automatic retry on transient errors.
- **Payments**: Stripe (subscriptions, checkout, customer portal, trial handling
  via webhooks).
- **Hosting**: Vercel (serverless, CI deploy from Git).
- **Observability**: custom error monitoring (server `onRequestError` +
  client error boundary → logging endpoint), funnel analytics events in GA4.
- **SEO**: generated sitemap, robots.txt, JSON-LD structured data, dynamic OG
  images, 11 keyword-targeted landing pages.

## 6. Business model & pricing

- **Free plan**: up to 5 songs; includes AI search/import, auto-scroll, stage
  mode.
- **Pro (Monthly)**: $9/month — unlimited songs, PDF export, sharing. Includes a
  **7-day free trial**.
- Single solo founder; hosting/AI costs are low (serverless + pay-per-call
  Gemini).

## 7. Traction & the core problem (honest numbers)

- A Google Ads Search campaign drove **~370 clicks**.
- Result: **1 signup**, and that single user created **1 song**.
- So the funnel is leaking almost everywhere: visitor → signup → activation →
  paid is essentially not happening at scale yet.
- Suspected causes identified so far:
  - **Ad keyword intent mismatch**: ads targeted lookup-intent terms ("guitar
    chord chart") rather than creator-intent ("chord sheet maker").
  - **No clear single niche / positioning** — marketed to "all musicians."
  - **Unclear paywall value** — why pay $9 isn't obvious; the "aha" may come too
    late.
  - A major **technical SEO bug** (now fixed): the homepage wasn't indexed by
    Google due to a www/non-www redirect/canonical mismatch.
- I've now instrumented a full GA4 funnel (events: editor_opened → start_choice
  → ai_search → import_success → first_chord_placed → song_saved) but don't have
  meaningful volume of real-user data yet.

## 8. Marketing & SEO done so far

- 11 statically-generated SEO landing pages targeting terms like "chord sheet
  maker", "guitar/piano/ukulele chord sheets", "worship chord sheets",
  "children's choir songs", "songs from music lessons", "create chord sheets
  online", each with FAQ + structured data + a CTA into the app.
- Verified in Google Search Console; sitemap submitted.
- Google Ads (currently poor ROI, likely paused/needs retargeting).

## 9. Competitive landscape

Established players include Ultimate Guitar, Chordify, OnSong, iReal Pro,
SongBook, Planning Center (worship). They have large catalogs, communities, and
brand recognition. ChordSheetMaker's potential differentiators: AI-assisted
creation from a title, clean drag-and-drop alignment, polished styling/presets,
authentic jazz lead-sheet rendering, and a fast no-install web experience. It
does NOT host a big public song catalog (deliberately, to avoid lyric/chord
copyright issues — sheets are user-created/private).

## 10. Known weaknesses / open questions

- **Positioning is too broad** — no single sharp target customer.
- **Conversion/activation is unproven** — need to find and fix the biggest
  funnel drop-off.
- **Value-for-$9 not clearly communicated.**
- **Acquisition channel uncertain** — ads underperformed; SEO is a slow burn;
  communities untested.
- **Retention/recurring-use loop** is unclear (what brings users back weekly?).
- **No social proof** (testimonials, user counts) yet.
- Copyright constraint: cannot host full lyrics publicly at scale.

## 11. What I want from you (the reviewing AI)

Please give concrete, prioritized recommendations on:
1. **Positioning & niche** — which single audience should I focus on first, and
   how should I reposition the messaging/landing pages for them?
2. **Conversion** — how to turn more visitors into signups and more signups into
   paying customers; where the "aha" moment should be; whether the free/paid
   split and $9 price are right.
3. **Acquisition** — the most promising channels for this product and audience
   (communities, content, partnerships, ads done right, etc.).
4. **Product** — features or changes that would most increase willingness to pay
   and retention (not just nice-to-haves).
5. **Quick wins vs. long-term bets** — what to do this week vs. this quarter.

Be blunt. Assume limited time and a solo founder budget. If the honest answer is
"this is a hard market and here's the narrow wedge that could work," say that.
