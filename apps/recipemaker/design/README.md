# RecipeBookMaker — UI style guide

Synced to the Claude Design project "RecipeBookMaker Design System".

## Two surfaces, opposite jobs

**Chrome** is the app: landing page, library, editor controls, login, admin.
It is fixed, uses the design tokens, and its job is to be predictable and get
out of the way.

**Canvas** is the recipe itself: title, ingredients, method, notes, background.
The AI restyles it per recipe — different fonts, colours and background every
time — and it **ignores the design tokens entirely**.

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

**Disabled primary means saved.** The Save button reading "Saved" and greying
out is feedback, not a dead control.

## Canvas rules

Full detail in `canvas/spec.html`. The short version:

- The AI writes **variables, never structure**. It picks colours, fonts and
  background; it does not pick whether ingredients are in an aligned column or
  whether steps are numbered.
- **Contrast is enforced in code, not requested in the prompt.** A model asked
  nicely will still produce sage-on-cream that fails 4.5:1. Clamp on the way in.
- **Quantities stay visually distinct** from ingredient names in every style.
  That distinction is what makes a recipe usable while your hands are busy.
- **Every style must survive print.** PDF export and eventual print-on-demand
  both put the canvas on paper.
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
| `canvas/spec.html` | Canvas | What the AI may and may not control |
| `canvas/default.html` | Canvas | The unstyled recipe — fallback and baseline |
| `canvas/styles.html` | Canvas | Three generated looks, identical markup |

## Applying it

`build.mjs` inlines `tokens.css` into every preview, because the Design System
pane renders files standalone — a relative stylesheet link leaves every card
unstyled, and that failure looks like a design problem rather than a path
problem.

Not yet applied to the running app: it still uses placeholder Tailwind
stone/amber. Porting the tokens into `globals.css` and restyling the chrome is
a separate step.
