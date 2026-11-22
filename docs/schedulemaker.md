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

### Name

Public name **Fixa schemat** (Schedule Maker is the repo's name for it). The
intended domain is `fixaschemat.se` — not bought as of 16 Sep 2026.
`skolschemat.se` was ruled out on purpose: `skolschema.se` is a live service for
the same audience, one letter away. The mark (`components/Logo.tsx`, and the
same drawing as `app/icon.svg`) is a school day as the sheet draws it: morning
lessons ending at different times, a lunch band, afternoon lessons.

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
- **Illustration** is a small drawing that belongs to the style, in the
  header's top-right corner (`ThemeIllustration.tsx`): a paper plane, a slate,
  a moon, a daisy, a sweet, a book, a quill, a sun. On by default, switched off
  like the icons, and stored with them. Drawn in the style's own accent colours
  through CSS classes, so ink-saving turns each into a black outline.
  Absolutely positioned: switching it changes nothing else on the sheet.

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

**Since 20 Nov 2026 there are two exceptions, both chosen by the person.**
Pressing Skapa PDF sends the schedule to the server for the seconds it takes to
print it (see "A vector PDF" below). And someone who makes an account and
presses Spara has that schedule stored until they delete it (see "Accounts").
The path with no account is untouched: nothing of it is kept anywhere.

### The pages, and the way between them (22 Nov 2026)

The app was one address. The front page was simply what showed when no schedule
existed, so anyone with a schedule could never see it again without pressing
"Börja om", which throws the schedule away. The editor had no logo and no way
home, and the only link to an account was a small grey word in a corner.

| Address | What it is |
| --- | --- |
| `/` | The start page: what this is, and where a timetable is uploaded. Always. |
| `/schema` | The editor: steps two and three, for the schedule this browser has open. With none, it goes to `/`. |
| `/scheman` | Mina scheman, for someone signed in. |
| `/login`, `/verify-request` | Signing in. |
| `/integritet` | The privacy page. |
| `/print` | Not for people: what the server's browser prints from. |

`/` and `/schema` are one component, `components/SchedulerApp.tsx`, given a
`view`. They share nearly everything they know, and what carries a schedule
from one to the other is what carries it across a reload: the browser's
storage. A read on the start page writes the schedule there and then, before
going to the editor, so the editor never opens to find nothing. The photograph
is the exception — it is deliberately never stored — and waits in a module
variable for the one page change.

Every page has the same strip across the top (`components/SiteHeader.tsx`):
the logo, which is the way home, and at most two links — "Nytt schema" from
the editor, and "Mina scheman" or "Logga in" where there are accounts. A row,
not a menu that folds out: two links do not need one. They are 44 points tall;
the lone link they replace was 28.

**There is no link in the strip to the schedule that is open, on purpose.**
There was, twice in one day: as "Mitt schema", which beside "Mina scheman"
raised the question it should have answered (someone with three saved
schedules has three of "mine"), and then by the schedule's own name. The
owner's point was simpler than either: a schedule is opened from "Mina
scheman". For someone with no account, whose one schedule lives in the
browser, the start page names the open schedule and has the button to it, and
the logo is one press from there.

Three things follow from the start page being reachable with a schedule open:

- It says which schedule is open, with a button back to it — but only when
  that schedule cannot be reached any other way (`openOnlyHere`): nobody is
  signed in, or it was never saved, or it has changed since it was. Signed in
  with a saved, unchanged schedule there is no strip; that schedule is in "Mina
  scheman". The wording follows the case: "är öppet.", "är öppet men inte
  sparat.", "har ändringar som inte är sparade."
- Uploading there makes a new schedule. If the open one is not safely saved,
  that is the same loss "Börja om" asks about, so it asks too.
- "Nytt schema" is therefore just a link to the start page. The open schedule
  stays where it is until something replaces it.

**Links made before the split point at `/#s=…`** and are out in class chats.
The start page passes them on to the editor whole. A link that cannot be read,
opened where no schedule is, ends on the start page with the message.

Checked in a browser on a laptop, not signed in: a read ending in the editor;
reload; the start page with a schedule open; the question before replacing
one; an old-style link with and without a schedule; a broken link; "Börja om";
the editor opened with nothing stored; the strip on a phone. **Not checked:**
anything signed in — "Spara", the return from signing in to `/schema?spara=1`,
opening from Mina scheman — because the dev database's password stopped
working on 22 Nov 2026 and `.env` needs a new connection string for `dev`.

The rest of the same walkthrough, done the same day:

- **On a phone the step's main action is a bar along the bottom** (`.actions-buttons`,
  fixed below 640 px): "Nästa: Skriv ut" in step two; Dela, PDF and Skriv ut
  in step three. It sat at the top of a page whose point is further down. The
  schedule now begins at 459 px in step three, from 524, and at 371 in step
  two when no choice is waiting. With a choice waiting it is still most of a
  screen down (689), because the question has to be answered first and is
  asked above the sheet.
- **Step three's buttons have an order.** One primary (Skriv ut), two beside it
  (Skapa PDF, Dela med klassen), and "← Redigera" and "Börja om" quiet. They
  were six of equal weight. On a phone "← Redigera" is gone; the stepper goes
  back.
- **Spara is a button, and says what it does.** Signed out it reads "Spara i
  ett konto", since pressing it leads to the login page. Saved, it reads
  "Sparat" in green: a state being reported, not a control out of order.
- **The shrink notice** ("krymps till 93 %") shows in step three only. It is
  about the printout.
- **The stepper's line has a fixed length per screen size.** One length asked
  to shrink was how "Ladda upp" got a rule through its last letters on a
  phone: the browser squeezed whole steps, not just their lines. It fits on
  one row at 360 px and wraps, rather than overflowing, at 320.

Measured in the preview pane's phone emulation at 375, 360 and 320 px wide.
Not tried on a real phone, where the bottom bar meets the browser's own
toolbar and the home indicator.

### Accounts and saved schedules (live since 22 Nov 2026)

The owner's decision: an optional account, so that a schedule can be found
again next term, with a paid plan for teachers to come later. Built the way
the other two apps are, on purpose — RecipeBookMaker's files were the template.

- **Its own database**: a Neon project named `schedulemaker`, in **Frankfurt**
  (`eu-central-1`). The other two are in US East; this one holds Swedish
  children's timetables, and that is the one place it does not copy them.
  `production` is the default branch and `dev` is a child of it, set never to
  be deleted. `apps/schedulemaker/.env` points at `dev`.
- **Tables** (`prisma/schema.prisma`): the same User, Account, Session,
  VerificationToken and ActivityLog as the other apps — plan and Stripe columns
  included, unused, so a paid plan later changes no table — plus `Schedule`,
  which holds a whole sheet as one JSON value (`SheetState`).
- **Sign-in** (`src/lib/auth.ts`): Google and an emailed link, each switched
  on by its own keys. `accountsEnabled` is false without a database, a session
  secret and at least one of them, and then nothing about accounts is drawn or
  reachable: `/api/me` says so, `/login` and `/scheman` go to the front page.
  Production has all of them since 22 Nov 2026, with Google as the one way in.
- **Saving** (`save()` in `components/SchedulerApp.tsx`): the editor's Spara. Signed out it
  leads to `/login?next=save`; the schedule waits in the browser and
  `/?spara=1` on the way back saves it unasked. The browser remembers which
  saved schedule it has open (`savedId`), so the next save updates that one.
- **Whether the open schedule has unsaved changes is written down**
  (`dirty`, beside `savedId` in the browser's storage), not worked out afresh.
  Two places need it that cannot work it out. The editor after a reload used
  to take whatever it found in storage to be the saved version, so a reload
  turned unsaved changes into "Sparat". And Mina scheman has to know before it
  replaces the open schedule: pressing Öppna there used to overwrite unsaved
  changes to a saved schedule without a word, even with that schedule's own
  saved version. It asked only when the open schedule had never been saved.
  Now it asks in both cases, and says which. Changed 22 Nov 2026; the editor's
  half was tried with a simulated sign-in; the question in Mina scheman was
  confirmed by the owner on the live site the same day.
- **Mina scheman** (`/scheman`): open, copy, delete, sign out, and delete the
  account. Deleting the account is one row; the database removes the rest
  (`onDelete: Cascade`).
- **Limits** live in `src/lib/plans.ts`, as in the other apps. There is one
  plan, and its 200-schedule ceiling is a guard, not a paywall.
- **The activity log** records that something happened and how big it was
  ("saved, 35 lessons"), never what was on the sheet or whose it was. It is
  also the first counting this app has had.

**Checked on a laptop against the dev database**, with two throwaway accounts
given sessions directly in the database (no sign-in method is set up locally):
save, list, open, update, copy, delete; one account reading, overwriting,
copying and deleting the other's schedule (refused every time, and the
schedule untouched); deleting an account (user and session gone); the editor's
button through Spara → Sparat → Spara ändringar; the question before an unsaved
schedule is replaced; the automatic save on `/?spara=1`. And a production build
with no database settings, run for real: front page as before, no account
links, `/login` and `/scheman` redirecting away.

**On the live site, 22 Nov 2026:** it reports accounts as on, the login page
offers Google, "Mina scheman" and the saved-schedule routes refuse a visitor who
is not signed in, and the owner signed in with Google for real. **Not checked
by anyone but the owner:** saving and opening on the live site. **Not set up:**
the emailed link (it needs a sending domain), and Google keys on a laptop, so
local sign-in still means putting a session in the dev database by hand.

Three things worth knowing before touching this:

- **`updateMany` throws at run time** ("Transactions are not supported in HTTP
  mode"): the Neon HTTP driver has no transactions and Prisma makes one. It
  typechecks and builds. Use `update` with the owner in `where`.
- **A page that asks who is signed in must be rendered per request.**
  `currentUserId()` calls `connection()` for that. Before it did, `/scheman`
  was built once at deploy time with nobody signed in, and would have sent
  every signed-in person back to the login page — in production only.
- **On a laptop, new rows are stamped an hour ahead** (local time written as
  if it were UTC, on insert but not on update), so a schedule saved again can
  sort below one made in the last hour. Vercel runs in UTC and does not have
  this. The other two apps' dev databases will show the same.

Installing the database and sign-in libraries tried to move the other two
apps' versions of them; they are pinned here to the exact ranges RecipeBookMaker
uses, and the lockfile gained seven lines and changed none.

How it went live, for the next app that does this: the tables were created in
`production` with `npx prisma db push` and that branch's connection string;
`DATABASE_URL`, a new `AUTH_SECRET`, `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are set in Vercel for Production only. The Google
sign-in client lives in the Google Cloud project "Schedule Maker" under the
clavos.se organisation — its own project, not ChordSheetMaker's, so the
sign-in screen carries this app's name. That name is "Schedule Maker", the
owner's choice, while the site calls itself Fixa schemat. When
`fixaschemat.se` is live the client needs that address added as a redirect.

**There is a privacy page, `/integritet`, since 22 Nov 2026**, and it describes
the code: what happens to a photo, a PDF, a shared link and a saved schedule,
what an account holds, which companies handle it and how to delete it. Every
sentence was checked against the code that day, and two against the live site
(a visitor who is not signed in gets no cookie from any page; no script or font
is loaded from another company). The comment at the top of
`src/app/integritet/page.tsx` lists what should send you back to it.

What it has to admit, and what would let it say less:

- **An account keeps more than it needs.** The sign-in library stores the name
  and picture Google sends and Google's tokens for that sign-in, and none of
  them is used. Dropping them is a small change to `lib/auth.ts`, but it is a
  change to sign-in, which can only be tried for real on the live site.
- ~~**The server is in the United States.**~~ **Moved to Frankfurt on 22 Nov
  2026.** Nothing said where Vercel should run the functions, and the live
  site's response headers showed them in US East (`x-vercel-id: arn1::iad1::…`,
  in at Stockholm, handled in Washington). `apps/schedulemaker/vercel.json` now
  names `fra1`, and the same header shows it for every route; accounts, a PDF
  and a text read were tried from there. Next's `preferredRegion` is not the
  way: its documentation says Vercel honours it only for the edge runtime.
  What still leaves the EU is the reading itself, which Google does where
  Google chooses, and the page says so.

Not built: the paid plan, any email other than the sign-in link, an admin view
of the activity log.

### Plus: a second plan, not yet for sale (22 Nov 2026)

The owner's idea: people who make schedules for others — a teacher, a coach,
whoever runs the after-school club — might pay for more. Started small, with
Stripe left for later on purpose. What exists is the machinery and one feature.

- **Two plans, in `src/lib/plans.ts`**: Gratis and Plus. `planFromUser()` puts
  an account on Plus if its `plan` column says so (what checkout will set), or
  if its address is in the server setting `PLUS_EMAILS`, a comma-separated
  list. That setting is how the owner and anyone trying it get Plus today,
  without touching the database.
- **One Plus feature: three more styles** — Hav, Lavendel and Grafit, marked
  `plus` in `lib/themes.ts`. They are built exactly like the free ones; what
  is sold is more to choose from, not a better sheet. In step three they sit in
  the row with a padlock for anyone not on Plus, and pressing one says what it
  is and leads to the Plus page. The start page's picker shows the free eight.
- **The lock is on the server**: `withinPlan()` in `lib/auth.ts`. A sheet
  saved or printed in a Plus style by an account that is not on Plus is saved
  or printed in the default style instead. The padlock in the picker is a sign
  on the door. Printing with the browser's own dialog cannot be stopped and is
  not tried.
- **The Plus page, `/plus`**, says what Plus includes, marks what exists
  ("Finns nu") from what does not ("Kommer": a link that always shows the
  latest version; sending the schedule to a list of addresses), and says more
  than once that it cannot be bought. Its button, "Jag vill ha Plus", writes
  one `plus_interest` row to the activity log for the signed-in account. That
  is the count of who wants it, and — because it is tied to the account — a
  list of who to tell. It is where the buy button will go.
- Mina scheman says which plan the account is on. The privacy page mentions
  the plan and the interest row.

**Checked on a laptop:** the three styles and their drawings on screen; the
padlock and its note; the picker with the plan simulated as Plus; a Plus style
sent to `/api/pdf` without Plus coming back in the default style; the interest
route refusing a visitor who is not signed in. **Not checked:** anything that
needs a real account — the interest button, saving in a Plus style, Mina
scheman's plan line — because the dev database still does not answer here.

To see how many want Plus, until there is an admin view: count the rows of
type `plus_interest` in the production `ActivityLog`.

Not built: checkout, a price, the two "Kommer" features, taking Plus away
again when someone stops paying.

### Sharing with the class (20 Nov 2026)

Everyone in a class is sent the same sheet, so one parent's finished schedule
is worth something to the other twenty-five. Step three has **Dela med
klassen**, which makes a link; whoever opens it gets a copy to put their own
child's name on.

**The schedule is in the link, after the `#`.** A browser does not send that
part to the server, so there is still no schedule on our side, no route besides
`/api/read`, and nothing in a log. That is the whole reason it is built this
way rather than as a stored share page like ChordSheetMaker's. The payload is
compact JSON, deflated in the browser and base64url-encoded
(`src/lib/share.ts`): an invented 7A week of 38 lessons with fourteen named
teachers came to about 1,300 characters.

What travels and what does not is decided in `toWire()` and explained at the
top of that file:

- **Goes:** class, school, days, times, subjects, teachers, rooms, notes, the
  names in the glossary, and any colour that is not the default.
- **Stays:** the banner ("Elins schema"), every choice made (all options come
  back as open questions — one child's German is not the next child's), and
  the style, paper and switches. The dialog lists this with the sheet's own
  words before the link is copied.

Opening a link: with no schedule in the browser it opens straight into step
two with a strip saying what to do. With one already there it asks first,
because there is room for one schedule and the link would replace it. Either
way the `#…` is removed from the address afterwards.

**A link is written by whoever sent it, so nothing in it is trusted.**
`fromWire()` caps sizes and counts, caps the unpacked size while inflating,
accepts a colour only as six hex digits, and refuses codes like `constructor`
that a plain-object glossary would answer to. A link that cannot be read gives
a message and leaves the current schedule alone.

Not done, and worth knowing:

- **Untested on a real phone.** The share sheet button ("Skicka länken") only
  appears where `navigator.share` exists, which the preview pane does not have.
  Whether a 1,300-character link survives each chat app was not tried either.
- **Nothing counts how often it is used** — the app has no measurement at all.
- **No unit tests**, like the rest of the app. `packSchedule` / `unpackSchedule`
  are pure and would be the first thing worth one. The checks made were by hand
  in a browser: round trip, an existing schedule, seven kinds of broken link.
- Anyone holding a link can read the schedule in it. The dialog says so.

### Skapa PDF (20 Nov 2026)

Step three has **Skapa PDF** beside Skriv ut: one press, one file, no dialog.
The print dialog can save a PDF too, and still does, but it looks different in
every browser and on a phone most people never find it.

It is made in the browser (`src/lib/sheetPdf.ts`), so the schedule still goes
nowhere. A copy of the sheet is laid out at the paper's width, drawn to a
canvas with `html2canvas`, and placed on one page of the chosen size with
`jsPDF`. **So this PDF is a picture of the sheet**: 600 dpi on A4 and about
420 on A3 (about 400 on a phone, see `PIXELS_TOUCH`), around 1.4 MB, and its
text cannot be selected. It was 290 dpi for its first hour, which is fine on
paper and visibly soft on a screen once you zoom. The picture is a JPEG at
quality 0.95: side by side with a lossless one, enlarged, they could not be
told apart, and the PDF library packs a PNG so slowly that the sharper file is
also the faster one (1.8 s against 3.4). The dialog's PDF is the vector one. Part 2's point stands — a press-ready file still needs a real
browser doing the printing.

It fits the page the way print does: if the sheet is taller than a page it is
laid out wider by the same factor, so the picture is the paper's shape with
nothing cut off.

Two things the canvas library does differently from the browser:

- It lifts each SVG out as an image with its computed styles on it. A
  *positioned* SVG then moves itself out of its own frame, which is why the
  style's illustration was missing until `unpinDrawings()` gave it a wrapper.
  Any new absolutely placed drawing on the sheet gets the same treatment
  automatically, but check it.
- It has no `text-overflow: ellipsis`. Text that the sheet cuts with "…" is cut
  without it in the PDF.

Checked in a browser on a laptop: Papper, Skymning, Lekfull and Godis, A4
landscape and portrait, ink-saving, and a schedule that shrinks to 78%. **Not
checked:** A3, a real phone (iPhone Safari above all, where both the canvas and
the download behave differently), and the file on paper.

### A vector PDF, printed on the server (20 Nov 2026)

The picture PDF above is not as sharp as a real one, and the owner wants a
real one from a button. Only a browser's own print engine makes that, and a
page may not call it without the dialog. So the browser runs on the server:

```
Skapa PDF  →  POST /api/pdf  { schedule, glossary, theme, paper, ink, … }
           →  cleanState()            checks it as if a stranger wrote it
           →  headless Chromium       puppeteer-core; @sparticuz/chromium on Vercel
           →  opens /print            this app's own page: ScheduleSheet + PrintFit
           →  page.pdf()              the same thing as "Spara som PDF"
           →  the PDF, and the browser is closed
```

`/print` is the point: it is the same sheet component and the same fit as step
three, so there is still one layout. Part 2 said the renderer has to be a
browser; this is that, without the press.

**Privacy.** This is the second thing sent to the server, after the photograph,
and it is treated the same: held in memory for the seconds it takes, written
nowhere, never logged. The front page says so, in the paragraph under "Ert
schema stannar hos er"; that sentence belongs to the switch below.

**State on 20 Nov 2026: on.** `PRINT_ON_SERVER` in `components/SchedulerApp.tsx` is `true`.
It shipped off first, was tried on the live site, and was switched on the same
day. Setting it to `false` sends everyone back to the picture.

- **Checked on Vercel:** all eight styles on A4 landscape, each one page, no
  images, text selectable, 115–180 kB, 1.5 s warm and 5–6 s from cold.
- **Checked on a laptop**, where the route uses the installed Chrome: portrait,
  A3 and ink-saving as well; the button gets the server's PDF, and gets the
  picture when the server call is made to fail. The 30-second limit on waiting
  for the server was not waited out.
- **Not checked:** a real phone, and what a month of this costs. Every PDF
  starts a browser; the route allows twenty per quarter-hour per address, and
  like `/api/read` that limit is per server instance.
- **Fonts.** The server's browser has one font, Open Sans. The three web-font
  styles bring their own display face (Lora, Caveat, Lexend); everything else —
  times and names in every style, and the headings of Papper, Krita, Skymning,
  Äng and Godis — is Open Sans in the PDF, whatever the parent's own device
  showed. The owner looked at it and took it as it is. The sheet refits itself
  for the font, so nothing overflows; it is the same from every device, which
  the screen is not. More fonts can be shipped if a style should keep its
  character: anything in `/tmp/fonts` when the browser starts is found.
- **A print bug this turned up, fixed in `PrintFit`:** a sheet shrunk to fit
  kept the paper's width and so came out narrower than the page — on a white
  style invisible, on Skymning a white strip down the right-hand side. It was
  in "Skriv ut" all along. The sheet is now laid out wider by the factor it is
  shrunk by, and the page behind it takes the sheet's colour.
- **Installing `puppeteer-core` moved two shared packages** in the lockfile:
  `ws` 8.20.0 → 8.23.0 and `zod` 4.3.6 → 4.6.7. Both are inside the ranges the
  other two apps ask for, and ChordSheetMaker uses `zod` in its MCP server.
  Their typechecks, unit tests and builds passed with them.
- `next.config.ts` names the Chromium files for the function
  (`outputFileTracingIncludes`); without that it works locally and fails only
  when deployed.

### Code map

| File | What it holds |
| --- | --- |
| `components/SchedulerApp.tsx` | All app state: schedule, glossary, theme, ink, icons, illustration, paper, mode. Rendered as the start page by `app/page.tsx` and as the editor by `app/schema/page.tsx` |
| `components/SiteHeader.tsx` | The strip across the top of every page |
| `app/api/read/route.ts` | The only route. Model call, limits, no storage |
| `components/Landing.tsx` | Front page. Hero is a real sheet from `lib/sample.ts`; the faults section pins six numbered faults on the same week as the school printed it |
| `components/ScheduleSheet.tsx` | The sheet, plus `useFitCards` |
| `components/PrintFit.tsx` | Whole-sheet measurement → print `zoom` |
| `components/FitToWidth.tsx` | Screen-only scaling, `transform`, never print |
| `components/GlossaryPanel.tsx` | Codes → words and colours |
| `lib/glossary.ts` | Name/colour mapping, golden-angle hues, `isBreak`/`isMeal` |
| `lib/readSchedule.ts` | Prompt and parser |
| `lib/share.ts` | A schedule packed into a link and read back out of one |
| `lib/sheetPdf.ts` | The finished sheet drawn to a one-page PDF, in the browser |
| `app/api/pdf/route.ts` | The finished sheet printed to a vector PDF by a browser on the server |
| `app/print/page.tsx` | The page that browser prints: the sheet and nothing else |
| `lib/sheetState.ts` | Paper sizes, the state a sheet is made from, and the check on one that arrives from outside |
| `lib/plans.ts` | The two plans and what each may do. The one place that decides |
| `app/plus/page.tsx` | What Plus is, and the button that counts who wants it |
| `components/SharePanel.tsx` | The dialog that makes the link and says what is in it |
| `types/schedule.ts` | The model and its time helpers |

### House rules that bite

- **This repository is public.** No customer names, addresses, revenue or
  `.env`. The sample photographs in `apps/schedulemaker/samples/` are real
  children's timetables, and that folder is gitignored. They must never move to
  `public/` — Next serves that over HTTP.
  - The exceptions are `public/solglantan.webp` and
    `public/manskensskolan.webp`, the photos in the faults section of the
    front page. The parent they belong to rebuilt both with invented schools,
    towns, years and teacher codes before they came here. Only the times are
    real — and for Solgläntan they have to be, because `lib/sample.ts` is the
    same week and the page compares the two. Any replacement needs the same
    treatment, by the person whose child it is — not a blur added afterwards.
- **Read `node_modules/next/dist/docs/` before writing Next code.** This is
  Next 16.2.2 and it is not the Next you remember.
- **`npx tsc --noEmit` and a production build before pushing.** `master` deploys
  to production automatically — which for this app currently means nothing, but
  will.
- Plain CSS on purpose. Print wants millimetres, `@page` and control over what
  breaks where; a utility framework built for screens fights all three.

### Before launch

The three web-font styles (Skolbok, Klassisk, Lekfull) are committed; the
`document.fonts` listeners in `PrintFit` and `useFitCards` refit cards once a
face has loaded. What is still open before this can go live:

- **The Gemini key must be on a paid tier.** On Google's unpaid tier, submitted
  content may be used to improve Google's products, which cannot be squared
  with sending a child's schedule. Since 16 Sep 2026 this app has its own key in
  its own project (it used to borrow RecipeMaker's, which is Tier 1 postpay).
  The new key works — a text read through `/api/read` returned 200 in 3.9 s —
  and its tier is confirmed in AI Studio: project "Schedule Maker"
  (`gen-lang-client-0130998856`), Tier 1, postpay, same billing account. Working
  alone would have proved nothing, since the unpaid tier answers the same way;
  whatever key goes into Vercel must be checked in AI Studio too.
- **Spending is watched, not capped.** `rateLimit` is an in-memory map, so on
  Vercel it is per instance — a brake, not a ceiling. The billing account
  already has a 200 kr/month budget with alerts at 50/90/100/150%, covering every
  project on it, this one included. Google Cloud also offers spend caps that
  pause a project when reached; a Schedule Maker-only cap (around 100 kr) was
  considered on 16 Sep 2026 and deliberately deferred. Revisit if the alerts
  ever fire, or if the read route is abused.
- **Print re-verified for A4 landscape** on 16 Sep 2026 (Chrome, Papper and
  Klassisk): one page each, 297 × 210 mm, all text present, dashed half-hour
  rules visible. It found one fault, now fixed: a short F-6 day left the bottom
  49 mm of the page blank, because the minute had a fixed height sized for a
  longer day. `usePageFill` now stretches the minute to fill the page (floor
  1.08 px, ceiling 2.5); measured after, the same week fills 99% of the page
  and a 07–17 day still prints at the floor, shrunk to 82% by PrintFit.
  Portrait and A3 are not re-verified.
- **For print-on-demand, later:** Chrome embeds the variable web fonts (Lora,
  and presumably Lexend and Caveat) as Type 3 fonts. Fine for a home printer;
  many print vendors reject Type 3, so check the vendor's spec before relying
  on those styles for a press.
- **Touch verified on a real iPhone** on 16 Sep 2026, against the deployed app:
  a photographed högstadieschema read correctly, the week swipes sideways, a
  tapped lesson opens its editor, and choosing a language group works. (The
  preview pane's phone emulation delivers no taps at all, so a real phone is
  the only test of this.) Printing from the phone was not tried.
- **Deployed** to Vercel as its own project, root `apps/schedulemaker`, with
  `GEMINI_API_KEY` as its only environment variable — nothing else in the
  repo's `.env.example` is read by this app. Live at
  https://schedulemaker-sigma.vercel.app/; every push to `master` deploys it.
  No custom domain yet.

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
