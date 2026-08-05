# @clavos/core

Infrastructure shared between apps in this monorepo.

## The rule that keeps this package useful

**Nothing here may import a database client, auth, or any product's domain
types.** Every module must work unchanged in an app that has never heard of
songs, recipes or worksheets.

That rule is why this package is small. It was extracted deliberately narrow:
these five modules had zero coupling to ChordSheetMaker's domain and zero
dependency on Prisma, so moving them proves the workspace wiring without
committing to decisions that haven't been made yet.

## What is deliberately *not* here

`prisma`, `auth`, `stripe`, `plans`, `activity` and `marketing` all look shared,
and eventually may be — but each of them presupposes an open question:

> **Do the apps share one database and one `User` table, or does each app get
> its own?**

Extracting them now would answer that question by accident. They stay in
`apps/chordsheetmaker/src/lib` until it's answered on purpose.

## Modules

| Import | What |
| --- | --- |
| `@clavos/core/ai` | Gemini transport — model ids, URL builder, fetch wrapper with retry. Prompts stay in the app. |
| `@clavos/core/pdf` | Renders a DOM element to a paginated A4 PDF. Page breaks are found by scanning the canvas for fully transparent rows. |
| `@clavos/core/rate-limit` | In-memory per-IP rate limiting for route handlers. |
| `@clavos/core/image` | Client-side image downscaling and compression before upload. |
| `@clavos/core/errors` | Server-side error reporting to `ERROR_WEBHOOK_URL`. |

## Consuming it

Add `"@clavos/core": "*"` to the app's dependencies and list it in
`transpilePackages` in `next.config.ts` — the exports point at TypeScript
source, so Next compiles it as part of the app.

## Note on the PDF module

It rasterises the DOM. That's right for chord sheets and recipes — visual,
image-heavy, read on screen. It is **not** right for worksheets, which are
printed and need selectable text, deterministic page breaks and answer lines
that land on the grid. WorksheetMaker will need a second, vector-based
exporter; don't try to make this one serve both.
