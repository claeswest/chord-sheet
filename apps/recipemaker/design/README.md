# RecipeBookMaker — UI style guide

Synced to the Claude Design project "RecipeBookMaker Design System".

## Two surfaces, opposite jobs

**Chrome** is the app: landing page, library, editor controls, login, admin.
It is fixed, uses the design tokens, and its job is to be predictable and get
out of the way.

**Canvas** is the recipe itself: title, ingredients, method, notes. The AI
restyles it per recipe — different faces, colours and sizes every time — and it
**ignores the design tokens entirely**.

A recipe styled in sage and cream sitting inside terracotta chrome is correct,
not a bug. The chrome is furniture; the recipe is the thing on the wall.
ChordSheetMaker already works this way: the app is dark purple while every
chord sheet looks like whatever suits that song.

`tokens.css` therefore governs the chrome only. The canvas has its own
contract, defined in `canvas/spec.html`.

## Chrome decisions worth not re-litigating

**No pure white, no neutral grey.** `#fff` reads as screen. Warm paper tones
and warm near-blacks read as page.

**Two type families, one job each.** Serif carries content so it looks set
rather than rendered. Sans carries the interface so controls never pretend to
be content.

**Body copy is 18px with 1.65 line height.** Instructions get read at arm's
length from a worktop, often with wet hands.

**Quantities are herb green, links are terracotta.** Keeping them apart means a
page full of measurements never looks like a page full of links.

**Danger is tinted, never solid.** Solid red draws the eye to the thing you
least want clicked.

**State is text; buttons are verbs.** The Save button always reads "Save" and
disables when there is nothing to save, with the state as a label beside it.
This page used to say the opposite — that a button reading "Saved" was feedback.
It isn't: it's a state pretending to be an action, and it invites a click that
does nothing.

**Recurring interaction decisions live in `components/patterns.html`.** Two-click
destructive confirms, AI proposing rather than deciding, controls revealed by
focus rather than hover, saving on navigation instead of asking. Read it before
adding a control, so the next one behaves like the last.

## Canvas rules

Full detail in `canvas/spec.html`. The short version:

- The AI writes **variables, never structure**. It picks colours, faces and two
  sizes; it does not pick whether ingredients are in an aligned column or
  whether steps are numbered. There is **no background image** — pictures here
  are of the food and sit in the document.
- **Faces are keys, not font names.** The generator chooses from
  `FONT_STACKS`; naming a face freely produces something plausible and
  uninstalled, which falls back silently and makes the feature look broken with
  nothing in the output to explain why. `BODY_FONT_KEYS` is the shorter list —
  handwriting and mono are headings only.
- **Contrast is enforced in code, not requested in the prompt.** `ink` must
  clear 7:1 and the supporting colours 4.5:1. A model asked nicely will still
  produce sage-on-cream that fails, confidently. Running the shipped presets
  through that same validator is what caught HEIRLOOM's quantities at 3.74:1.
- **A hand-picked style is advised, not overruled.** The generator is held to a
  standard because nobody chose its palette; a person choosing their own is
  entitled to a bad idea.
- **Quantities stay visually distinct** from ingredient names in every style.
  That distinction is what makes a recipe usable while your hands are busy.
- **Print is settled.** Backgrounds are required light, and export is the
  browser's print dialog over a real stylesheet rather than a rasterised image —
  so a canvas prints as selectable text and there is no second variant to keep
  in step.
- **A recipe with no style is not broken.** The default canvas has to be good on
  its own — it is what every recipe looks like before the AI runs, if generation
  fails, and if the user turns styling off.

## Files

| Path | Group | What |
| --- | --- | --- |
| `tokens.css` | — | Chrome tokens. The only place values are defined. |
| `build.mjs` | — | Inlines tokens into each preview. Run after editing tokens. |
| `foundations/chrome-vs-canvas.html` | Foundations | The boundary, shown side by side |
| `foundations/colors.html` | Foundations | Palette and intended use |
| `foundations/type.html` | Foundations | Scale, families, why body is 18px |
| `components/buttons.html` | Chrome | Variants and when to use which |
| `components/ingredient-editor.html` | Chrome | Editor rows — inputs and controls |
| `components/recipe-card.html` | Chrome | Library grid and empty state |
| `components/patterns.html` | Chrome | Recurring interaction decisions and why |
| `canvas/spec.html` | Canvas | What the AI may and may not control |
| `canvas/default.html` | Canvas | The unstyled recipe — fallback and baseline |
| `canvas/styles.html` | Canvas | Three generated looks, identical markup |

## Applying it

`build.mjs` inlines `tokens.css` into every preview, because the Design System
pane renders files standalone — a relative stylesheet link leaves every card
unstyled, and that failure looks like a design problem rather than a path
problem.

The tokens ARE applied: `src/app/globals.css` carries them as Tailwind v4
`@theme` values. An earlier version of this page said they were not yet ported,
which stopped being true the same week. Change a value in `tokens.css`, mirror
it in `globals.css`, and run `build.mjs` — three places, deliberately, so the
guide can never quietly stop describing the product.
