// Prompts for generated recipe pictures.
//
// Illustration, never photorealism — and that is a deliberate choice, not a
// stylistic whim. A photographic image of a finished dish is a picture of a
// meal that was never cooked. These pictures end up on a printed page and on
// a public /share link, where a photo reads as a record of the real thing. An
// illustration is honest about being drawn, and it stays useful: for a step
// like "fold in the parsley", a drawing shows the action far better than a
// staged photo would.
//
// It also sidesteps the uncanny end of generated food photography, which is
// where these models are least reliable.

export type ImageKind = "hero" | "step";

/** Keeps the pictures of one recipe looking like a set rather than a jumble. */
const HOUSE_STYLE =
  "Loose watercolour and ink illustration, warm muted palette, visible brush texture, " +
  "generous white space, no text, no lettering, no watermarks, no hands holding utensils " +
  "unless the action requires it, plain uncluttered background.";

export function heroPrompt(title: string, description: string | null, ingredients: string[]): string {
  const what = [title, description ?? ""].filter(Boolean).join(". ");
  const key = ingredients.slice(0, 6).join(", ");
  return [
    `Illustrate the finished dish for a recipe called "${what}".`,
    key ? `The main ingredients are: ${key}.` : "",
    "Show the dish plated and ready to eat, from a three-quarter angle.",
    "Draw only what the ingredients suggest — do not invent garnishes or side dishes.",
    HOUSE_STYLE,
  ]
    .filter(Boolean)
    .join(" ");
}

export function stepPrompt(recipeTitle: string, stepText: string, n: number): string {
  return [
    `Illustrate step ${n} of a recipe for "${recipeTitle}".`,
    `The step is: "${stepText}"`,
    "Show the action or the state of the food at this moment, not the finished dish.",
    "Keep it simple and instructional — one clear subject, close in.",
    HOUSE_STYLE,
  ].join(" ");
}
