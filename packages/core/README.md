# @clavos/core

Infrastructure shared between apps in this monorepo.

## The rule that keeps this package useful

**Nothing here may import a database client, or any product's domain types.**
Every module must work unchanged in an app that has never heard of songs,
recipes or worksheets.

That rule is why this package is small. It was extracted deliberately narrow:
these five modules had zero coupling to ChordSheetMaker's domain and zero
dependency on Prisma.

## Decided: each app gets its own database (5 Aug 2026)

The apps do **not** share a database or a `User` table. Each product is its own
Neon **project**, so any one of them can be sold, handed over or deleted without
untangling it from the others. That optionality is the whole reason for the
choice, and it was made knowing the price:

- no shared login — accounts are per product
- Stripe, admin and lifecycle email exist once per app
- a "Creator Bundle" across products would need a separate identity service

### What that means for this package

The blocker was never the code, it was *whose* `User` table. With separate
databases, `auth`, `billing`, `plans` and `activity` can still live here — they
just have to **take the Prisma client as an argument** rather than importing
one:

```ts
// right: works against whichever database the app owns
export function syncSubscription(db: PrismaLike, subscriptionId: string) { … }

// wrong: binds this package to one app's database
import { prisma } from "…";
```

Move them here when the second app actually needs them, not before.

### The part that will drift, and the plan for it

`User`, `Account`, `Session`, `VerificationToken` and the Stripe columns will be
identical in every app. Copied by hand, they will not stay identical — one app
gains a column, another doesn't, and shared billing code breaks on whichever app
was touched least recently.

Intended fix, to build alongside the second app:

1. `packages/db-base/` holds the common models as the single source of truth.
2. A script concatenates base + product-specific models into each app's
   `schema.prisma` before `prisma generate`.
3. CI fails if any app's base section differs from `db-base`.

Low-tech on purpose: drift becomes a failing check rather than a surprise.

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
