// Turning a blob of recipe text into a structured recipe.
//
// The model's output is treated as untrusted. Everything below the prompt is
// validation: a plausible-looking recipe with a string where a number belongs,
// or a missing ingredients array, would otherwise be written straight into the
// content JSON and break the editor at read time rather than at import time.

import type { Ingredient, RecipeContent, Step } from "@/types/recipe";

export type ImportedRecipe = {
  title: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  source: string | null;
  content: RecipeContent;
};

// The total-time rule below is a workaround for a gap in the schema: there is
// no totalMinutes column — the card derives it as prep + cook. Recipe sites
// very often publish only a total, so without a rule the model has to invent a
// split, and it invented a different one on each run of the same recipe.
// Parking the total in cookMinutes keeps the card's number right. If totals
// turn out to be the common case, the honest fix is a real column.
export const IMPORT_PROMPT = `You are given the raw text of a recipe, copied from anywhere — a website, a message, an email, a photo transcription. Extract it into JSON.

Rules:
- Output ONLY a JSON object. No markdown fence, no commentary.
- Use the SAME LANGUAGE as the input. Do not translate.
- Do not invent ingredients, steps, quantities or times. If something is absent, use null.
- IF THE INPUT IS A PICTURE: transcribe only words that are actually written in it — a cookbook page, a screenshot, a handwritten card. Judge nothing from how the food looks. A photograph of a finished dish with no writing in it is NOT a recipe: in that case return exactly {"error":"no_text"} and nothing else. Reconstructing a plausible recipe from a picture of food is the worst thing you can do here, because it looks right and is fiction.
- Times: prepMinutes and cookMinutes only when the source separates them. If it gives ONE total ("Under 45 min", "Klart på 1 timme", "Ready in 30 minutes"), put that total in cookMinutes and leave prepMinutes null. Never split a total by guessing.
- quantity is a NUMBER or null. "a pinch", "to taste", "some" → quantity null, and put that wording in note.
- Convert fractions to decimals: ½ → 0.5, ¼ → 0.25, 1½ → 1.5.
- unit is a short string ("dl", "g", "tbsp", "cloves") or "" when the ingredient is counted ("3 eggs" → quantity 3, unit "").
- Split "2 onions, finely chopped" into name "onions" and note "finely chopped".
- Group ingredients only when the source does ("For the sauce"). Otherwise one group with heading "".
- Steps are instructions only. Do not number them in the text — numbering is added by the app.
- description is one short line if the source has one, else null.
- source is a person, book or site if named, else null.

Shape:
{
  "title": string,
  "description": string | null,
  "servings": number | null,
  "prepMinutes": number | null,
  "cookMinutes": number | null,
  "source": string | null,
  "ingredientGroups": [{ "heading": string, "items": [{ "quantity": number|null, "unit": string, "name": string, "note": string|null }] }],
  "stepGroups": [{ "heading": string, "items": [{ "text": string }] }],
  "notes": string[]
}

Recipe text:
`;

const uid = () => Math.random().toString(36).slice(2, 10);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

/** Numbers only, and only sane ones — a model returning "4-6" or 99999 shouldn't reach the DB. */
function num(v: unknown, max = 100_000): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Strips a ```json fence if the model added one despite being told not to. */
export function stripFence(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

export class ImportError extends Error {}

/**
 * Parses and validates the model's JSON into something safe to store.
 * Throws ImportError with a message worth showing a user.
 */
export function parseImported(raw: string): ImportedRecipe {
  let data: unknown;
  try {
    data = JSON.parse(stripFence(raw));
  } catch {
    throw new ImportError("Couldn't read that as a recipe. Try pasting a bit more of the text.");
  }
  if (!data || typeof data !== "object") throw new ImportError("That didn't look like a recipe.");
  const d = data as Record<string, unknown>;

  // The model's signal that a picture held no readable recipe. Worth an
  // explicit channel: asked to extract a recipe from a photo of a finished
  // dish, it will otherwise write a confident, plausible, entirely invented
  // one — verified, before this rule existed, on a picture of pasta.
  if (d.error === "no_text") {
    throw new ImportError(
      "There's no recipe text in that picture. Photograph the page or the card, not the food.",
    );
  }

  const ingredientGroups = asArray(d.ingredientGroups)
    .map((g) => {
      const gr = (g ?? {}) as Record<string, unknown>;
      const items: Ingredient[] = asArray(gr.items)
        .map((it) => {
          const i = (it ?? {}) as Record<string, unknown>;
          const name = str(i.name);
          if (!name) return null; // an ingredient with no name is noise
          const note = strOrNull(i.note);
          return {
            id: uid(),
            quantity: num(i.quantity),
            unit: str(i.unit),
            name,
            ...(note ? { note } : {}),
          } satisfies Ingredient;
        })
        .filter((i): i is Ingredient => i !== null);
      return { id: uid(), heading: str(gr.heading), items };
    })
    .filter((g) => g.items.length > 0);

  const stepGroups = asArray(d.stepGroups)
    .map((g) => {
      const gr = (g ?? {}) as Record<string, unknown>;
      const items: Step[] = asArray(gr.items)
        .map((it) => {
          const s = (it ?? {}) as Record<string, unknown>;
          // Accept a bare string too — models return ["Do this"] surprisingly often.
          const text = typeof it === "string" ? it.trim() : str(s.text);
          return text ? ({ id: uid(), text } satisfies Step) : null;
        })
        .filter((s): s is Step => s !== null);
      return { id: uid(), heading: str(gr.heading), items };
    })
    .filter((g) => g.items.length > 0);

  // A recipe with neither ingredients nor steps means the extraction failed,
  // whatever the model claimed. Better to say so than to save an empty shell.
  if (ingredientGroups.length === 0 && stepGroups.length === 0) {
    throw new ImportError("Couldn't find ingredients or steps in that text.");
  }

  const content: RecipeContent = {
    ingredientGroups: ingredientGroups.length
      ? ingredientGroups
      : [{ id: uid(), heading: "", items: [] }],
    stepGroups: stepGroups.length ? stepGroups : [{ id: uid(), heading: "", items: [] }],
    notes: asArray(d.notes).map(str).filter(Boolean),
  };

  return {
    title: str(d.title) || "Untitled recipe",
    description: strOrNull(d.description),
    servings: num(d.servings, 500),
    prepMinutes: num(d.prepMinutes, 10_000),
    cookMinutes: num(d.cookMinutes, 10_000),
    source: strOrNull(d.source),
    content,
  };
}
