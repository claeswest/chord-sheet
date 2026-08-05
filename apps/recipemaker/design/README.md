# RecipeBookMaker — UI style guide

Source of truth: **`tokens.css`**. Every preview here imports it, and
`src/app/globals.css` should too. A token changed here must change the product,
or this folder becomes decoration.

Synced to the Claude Design project "RecipeBookMaker Design System".

## The direction, in one line

Warm, printed, editorial — recipes worth keeping should look like paper and ink,
not like software.

This is deliberately unlike ChordSheetMaker's dark purple. They are separate
products with separate brands; only infrastructure is shared.

## Decisions worth not re-litigating

**No pure white, no neutral grey.** `#fff` reads as screen. Paper tones and
warm near-blacks read as page.

**Two type families, one job each.** Serif carries the recipe so it looks set
rather than rendered. Sans carries the interface so controls never pretend to
be content.

**Body copy is 18px with 1.65 line height.** Instructions get read at arm's
length from a worktop, often with wet hands. This is the one place the UI
should feel generous rather than tidy.

**Quantities are herb green, links are terracotta.** Keeping them apart means a
page full of measurements never looks like a page full of links.

**Quantity can be empty.** "To taste" is a real ingredient. An em dash holds
the column; the qualifier goes in the note. Never force a number.

**Danger is tinted, never solid.** Solid red draws the eye to the thing you
least want clicked.

**Disabled primary means saved.** The Save button reading "Saved" and greying
out is feedback, not a dead control — it answers "did that go through?"
without a toast.

## Files

| Path | What |
| --- | --- |
| `tokens.css` | Colour, type, space, shape. The only place values are defined. |
| `foundations/colors.html` | Palette with intended use per token |
| `foundations/type.html` | Scale, families, and why body is 18px |
| `components/buttons.html` | Variants, sizes, and when to use which |
| `components/ingredient-row.html` | Read and edit states, grouping, empty quantity |
| `components/recipe-card.html` | Library grid and empty state |
| `components/recipe-page.html` | A full recipe — how it all composes |

## Not yet applied

The running app still uses placeholder Tailwind stone/amber. Applying these
tokens to `globals.css` and the components is a separate step — the guide was
written first so the app has something to be measured against.
