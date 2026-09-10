# Schedule Maker — what it is, and where print-on-demand would fit

*Written for someone picking the app up cold. Part 1 describes what exists;
Part 2 is a proposal that has not been decided on.*

---

## Part 1 — The app

### In one paragraph

Photograph the timetable a school sent home, and get back a sheet worth putting
on the fridge. The photo is read by a model into a structured schedule; the
codes on it (`SV`, `DLE`, `21SVESVESVE01bSA21A`) become words; the result is
laid out on a proportional time grid and printed on one page. It is the third
app in this monorepo, after ChordSheetMaker and RecipeBookMaker, and the only
one that is **paper first**.

### Status

Working end to end, and **not deployed anywhere**. It runs locally on port 3002
via `npm run dev:schedules`. There is no account, no database, no billing and no
Tailwind. Verified against three real printouts (an F-6, a lower-secondary and
an upper-secondary sheet) and one real print to PDF: one A4 landscape page,
297 × 210 mm, at full size.

### The pipeline

```
photo/paste/drag  →  compressImage (browser, 1600px)
                  →  POST /api/read       { image: dataURL }  or  { text }
                  →  Gemini, temperature 0, JSON out
                  →  parseSchedule()      validates and shapes
                  →  localStorage         and nowhere else
                  →  edit → decide choices → view → print
```

`/api/read` is the only route. It is rate limited to six calls per quarter hour
per IP (`@clavos/core/rate-limit`), caps the image at ~3 MB decoded, and stores
nothing. `READ_PROMPT` in `src/lib/readSchedule.ts` is transcribe-only: it is
told to refuse with `{"error":"no_schedule"}` rather than invent, because an
earlier version of this pipeline in RecipeBookMaker confabulated a plausible
recipe from a bare URL and we would rather return nothing than a timetable
nobody has.

### The data model

`src/types/schedule.ts`. Two decisions in it are load-bearing:

**Times are strings, never arithmetic.** `"08:20"` is copied as printed. A
schedule that renders 08:20 as 08:00 because something parsed it into a number
has told a child the wrong thing. The one place a time becomes a number is
`minutesOf()`, and that result is only ever used for *position*; what a card
prints is still the quotation.

**Two grids become one week.** A sheet printed as "jämna veckor" and "udda
veckor" is folded into a single week as it is read: a lesson identical in both
appears once, and lessons that differ appear as two at the same time, each
carrying its grid's label in `note`. The sheet then draws them as one box with
two rows — which is already what a one-grid sheet does when it writes "BL jv"
and "SV uv" in a single cell.

This replaced rendering two full grids under each other, which said the same
thing twice and printed at 66% to fit a page. `weeks` is still an array, and
the multi-grid rendering still works, because schedules read by earlier
versions are sitting in people's browsers with two entries in it.

**Choice slots.** Lessons sharing a start time are alternatives, not a sequence:
a language block offering five languages, or a cell split into art on even weeks
and Swedish on odd. `resolved` records that a human looked; `hidden` records
that an option was set aside but not destroyed. The step from EDIT to VIEW is
gated on every choice being resolved, because a printed timetable offering five
languages at once is simply wrong.

### The sheet

`src/components/ScheduleSheet.tsx` renders both the editable and the finished
sheet — one component, because two would drift.

- **Proportional.** A clock down the margin, a column per day, and every box as
  tall as its lesson is long. This replaced an hour-per-row grid that filed each
  lesson under its start hour: a lesson from 10:55 to 11:50 sat in the ten
  o'clock row, so reading across eleven showed lunch instead. The school's own
  printouts are proportional for exactly this reason.
- **Sized in millimetres.** `.sheet` is `297mm × 210mm`; `@page` is injected
  from the chosen paper. What is on screen is what comes out.
- **The layout is measurement-driven.** `useFitCards` (in ScheduleSheet) shrinks
  any card whose text will not fit its own minutes, stepping down and
  re-measuring; `PrintFit` measures the whole sheet and applies a print `zoom`
  if it exceeds the page. Both re-run when fonts load. **This is the single most
  important fact about the code**: the layout is defined by browser text
  metrics, not by numbers in a file. See Part 2 — it decides how a
  server-side renderer has to work.
- Lunch is a landmark, not a lesson: a grey band in letterspaced capitals.
  Ten subjects get a small stroked icon (`SubjectIcon.tsx`), drawn for 3.5 mm.

### Styles and settings

`src/lib/themes.ts` plus `[data-theme]` blocks in `globals.css`. A style is a
handful of CSS custom properties — paper, ink, muted, rule, accent, accent-soft
and a display face — and nothing else. It cannot reach the parts that could
break, which is why there can be a row of them.

Two settings are deliberately *not* styles, because they are not matters of
taste:

- **Ink-saving** is a fact about your printer. It applies over whichever style
  is chosen and wins on colour — printing a dark paper to save ink is the one
  combination that makes no sense. The style's letterform survives it.
- **Subject icons** are a fact about the reader's age. On for a seven-year-old,
  probably off for a sixteen-year-old.

Both are checkboxes (`Check.tsx`), not pills, because a setting that looks like
a command gets read as one.

### Privacy — the constraint everything else bends around

There is no account, no database and nothing stored on a server. The schedule
lives in this browser's `localStorage`. The source photograph is held in memory
only and never written to disk. The image goes to Google to be read and is not
retained by us.

The reasoning is in the code and should stay there: *a child's schedule is a
name, a class, a school and where they are every hour of the day; the cheapest
way to look after that is not to have it.*

Read Part 2 with this in mind. It is the thing print-on-demand collides with.

### Code map

| File | What it holds |
| --- | --- |
| `app/page.tsx` | All app state: schedule, glossary, theme, ink, icons, paper, mode |
| `app/api/read/route.ts` | The only route. Model call, limits, no storage |
| `components/Landing.tsx` | Front page. Hero is a real sheet from `lib/sample.ts` |
| `components/ScheduleSheet.tsx` | The sheet, plus `useFitCards` |
| `components/PrintFit.tsx` | Whole-sheet measurement → print `zoom` |
| `components/FitToWidth.tsx` | Screen-only scaling, `transform`, never print |
| `components/GlossaryPanel.tsx` | Codes → words and colours |
| `lib/glossary.ts` | Name/colour mapping, golden-angle hues, `isBreak`/`isMeal` |
| `lib/readSchedule.ts` | Prompt and parser |
| `types/schedule.ts` | The model and its time helpers |

### House rules that bite

- **This repository is public.** No customer names, addresses, revenue or
  `.env`. The two sample photographs are real children's timetables and live in
  `apps/schedulemaker/samples/`, which is gitignored. They must never move to
  `public/` — Next serves that over HTTP.
- **Read `node_modules/next/dist/docs/` before writing Next code.** This is
  Next 16.2.2 and it is not the Next you remember.
- **`npx tsc --noEmit` and a production build before pushing.** `master` deploys
  to production automatically — which for this app currently means nothing, but
  will.
- Plain CSS on purpose. Print wants millimetres, `@page` and control over what
  breaks where; a utility framework built for screens fights all three.

### In flight

At the time of writing, the working tree has uncommitted work adding three
styles (Skolbok, Klassisk, Lekfull) that use self-hosted Google fonts via
`next/font/google`, with `document.fonts` listeners added to both `PrintFit` and
`useFitCards` so cards refit once a face has loaded. That refit is the right
instinct: web fonts and a measured layout only coexist if the measurement runs
again afterwards.

---

## Part 2 — Print-on-demand (a proposal, not a decision)

Nothing here has been agreed. It is written so it can be argued with.

### Why it might be the right revenue path

The app has no account and no subscription, and adding either would cost it the
privacy stance that is currently its best argument. A physical object sidesteps
that: you pay for a thing, once, and the free path stays exactly as free and as
private as it is now.

It also matches the product's own claim. The whole sheet is designed for a
fridge door — the banner is letterspaced so it reads across a kitchen. The
natural object to sell is therefore **not a poster**: it is a magnet, or a
laminated sheet that survives a school year in a hallway.

### What the product could be

Ranked by how well it fits what the app already argues for:

1. **A magnetic A4 sheet.** The literal object the design is for. One per child.
2. **Laminated A4 or A3.** Survives a term on a wall; wipeable.
3. **A3 poster on heavy stock.** Easiest to source; least well matched to use.
4. **A set** — one per child in the family, which is also where the "whose week
   is this?" banner earns its place.

A schedule is worth printing perhaps twice a year, per child, and demand is
sharply seasonal: August–September and January. That argues for a low-friction,
low-price purchase rather than anything with an account behind it.

### The technical shape

**The renderer has to be a browser.** This is the part to get right, and the
reasoning is in Part 1: the layout is produced by measuring text. `useFitCards`
shrinks a card by reading `scrollHeight` against its slot; `PrintFit` reads the
whole sheet. None of that exists as numbers a PDF library could consume.

So the print-ready file should be produced by **headless Chromium rendering the
same React page** — Playwright or Puppeteer, `printBackground: true`,
`preferCSSPageSize: true`. That reuses the entire layout, and what the customer
approved on screen is what the press receives. Any other approach — redrawing in
`pdf-lib`, or rebuilding the sheet in a vendor's template editor — is a second
implementation of the layout that will drift from the first, and the drift will
show up as a wrong timetable on somebody's wall.

Consequences to plan for:

- A server-side render needs the schedule **as data**, or the finished PDF, sent
  to us. Today neither ever leaves the browser. This is the collision.
- Vendors want bleed (usually 3 mm), a safety margin, embedded fonts and often
  CMYK. The sheet is vector text and flat fills, which is the easy case — but
  `@page { margin: 0 }` and a 297 × 210 mm box is a *trim* size, not a bleed
  box. A bleed variant of the page CSS will be needed.
- The self-hosted Google fonts now being added must be embedded in the PDF.
  `next/font` self-hosting helps; verify with `pdffonts` on the output.

### The privacy collision, and how to keep the promise

Ordering a physical object requires, at minimum: the sheet (a child's name,
school and daily movements), a delivery address, and a payment. All three are
things this app currently does not have.

The proposal is to keep the promise **for everyone who does not order**, and to
be narrow and loud about what changes for those who do:

- The free path stays byte-for-byte as it is. No schedule leaves the browser
  unless someone presses "order".
- On ordering, send the minimum: ideally the rendered PDF only, not the
  structured schedule. Retain it only until the vendor confirms the order, then
  delete on a hard schedule — hours, not months — and keep only an order id and
  status.
- Say this on the order screen in the same plain language the rest of the app
  uses. "Vi behöver ditt schema för att kunna trycka det, och raderar det när
  det är skickat" is both true and reassuring; a privacy policy nobody reads is
  neither.
- Payments via Stripe, which is already wired for the other two apps in this
  repo. Never handle card details ourselves.

### Vendors — what to check, before choosing

Candidates worth evaluating: **Gelato** (EU/Nordic local production, order API),
**Printful**, **Printify**. None has been evaluated. The questions that decide
it:

1. Is there a **magnet** or laminated SKU, or only paper posters?
2. Local production in Sweden or the EU — what is delivery time and cost to a
   Swedish address in late August, their busiest month?
3. PDF spec: trim, bleed, colour profile, minimum dpi for the vector case.
4. An API for placing an order and a webhook for status, or only a dashboard?
5. What is the unit cost at quantity one? This product has no bulk.
6. Who is the merchant of record, and who handles a reprint when the press
   smudges a Tuesday?

### Open questions for a human

- Which object — magnet, laminate or poster? This decides the vendor shortlist
  more than anything else.
- Is the sheet the product, or is a **term's worth** the product (a schedule
  plus a blank week planner, say)?
- Does ordering require an account? The recommendation here is emphatically no:
  an email address for the receipt, and nothing else.
- Free path forever, or does print-on-demand eventually subsidise a hosted
  version with saved schedules? The two answers pull the architecture in
  opposite directions and it is worth deciding early.
