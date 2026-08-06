// Core data types for recipe content.
//
// Mirrors the pattern proven in ChordSheetMaker: the database stores an opaque
// JSON `content` column and the structure lives here in TypeScript. That's what
// lets the shape evolve without a migration, and it's why adding a second
// product needed no schema redesign.
//
// Ingredients stay *inside* this JSON rather than in their own table. Scaling
// portions and converting units both work fine on typed JSON. Relational
// ingredient rows are only needed to query *across* recipes ("what can I cook
// with what's in the fridge?"), which is a later feature — see the note at the
// bottom before adding them.

/** A single ingredient line. */
export type Ingredient = {
  id: string;
  /** Numeric so portions can be scaled. Null for "a pinch", "to taste". */
  quantity: number | null;
  /** Free text so "tbsp", "dl", "cloves" and "" are all valid. */
  unit: string;
  /** "plain flour", "large eggs, beaten" */
  name: string;
  /** "finely chopped", "at room temperature" */
  note?: string;
};

/**
 * Ingredients are always grouped, even when there is only one group. A single
 * unnamed group is the common case; "For the sauce" / "For the topping" is the
 * reason the structure exists. One shape means no special-casing in the editor.
 */
export type IngredientGroup = {
  id: string;
  /** Empty string for the default, unnamed group. */
  heading: string;
  items: Ingredient[];
};

/** One numbered instruction. */
export type Step = {
  id: string;
  text: string;
  /** Optional per-step image — "what it should look like at this point". */
  imageUrl?: string;
  /** Oven temperature in °C, when this step is the one that needs it. */
  temperatureC?: number;
  minutes?: number;
};

/** Steps are grouped for the same reason ingredients are. */
export type StepGroup = {
  id: string;
  heading: string;
  items: Step[];
};

export type Nutrition = {
  /** Per serving. All optional — most recipes will have none of it. */
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

/** Everything the editor owns. Stored as the `content` JSON column. */
export type RecipeContent = {
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];
  /** Free-form tips, "grandma always added…", storage advice. */
  notes: string[];
  nutrition?: Nutrition;
  /**
   * The full-size picture of the finished dish, as a data URL.
   *
   * In here rather than in a column because the library list selects columns
   * and would then drag a few hundred KB per card across the wire. The small
   * version lives in Recipe.imageUrl, which is what the cards show.
   */
  heroImage?: string;
};

/** Columns on the Recipe row — queried and filtered, so not inside `content`. */
export type RecipeMeta = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  servings?: number | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  /** Where it came from: a URL, a book, or "Mormor Karin". */
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Recipe = RecipeMeta & {
  content: RecipeContent;
};

/** Total time is derived, never stored — two fields that can disagree is a bug. */
export function totalMinutes(r: Pick<RecipeMeta, "prepMinutes" | "cookMinutes">): number | null {
  if (r.prepMinutes == null && r.cookMinutes == null) return null;
  return (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
}

/** An empty recipe — one unnamed group each, so the editor always has a row. */
export function emptyContent(): RecipeContent {
  return {
    ingredientGroups: [{ id: "g1", heading: "", items: [] }],
    stepGroups: [{ id: "s1", heading: "", items: [] }],
    notes: [],
  };
}

// ── Before adding relational ingredients ────────────────────────────────────
//
// The pull will come from features like "recipes I can make tonight" or a
// shopping list that merges quantities across recipes. Neither needs a schema
// change to *start*: a shopping list can be built by reading the JSON of the
// selected recipes. Only move ingredients into their own table when you need to
// query across recipes without loading them all — and expect to need an
// ingredient-normalisation step ("plain flour" vs "flour, plain") at that point,
// which is the real work, not the table.
