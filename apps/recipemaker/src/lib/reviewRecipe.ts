// A second pass over an imported recipe: what looks wrong, and what it
// probably should say.
//
// This exists because the importer is now deliberately literal. It copies
// "2 c. baking soda" and "1 c. lemon extract" exactly as the card has them,
// which is right — but it means obvious slips survive into the recipe. So the
// checking happens here instead, where it is a separate, visible act with the
// original still on the page beside it.
//
// Nothing here writes anything. It returns proposals; a person accepts them
// one at a time, or doesn't.

import type { RecipeContent } from "@/types/recipe";

export type Fix = {
  ingredientId: string;
  /** What the recipe says now, for showing beside the proposal. */
  from: string;
  quantity: number | null;
  unit: string;
  /** Why, in one line, in the reader's language. */
  why: string;
};

export const REVIEW_PROMPT = `You are checking a recipe that was transcribed from a photograph or pasted text. The transcription was deliberately literal, so any mistakes in the original are still in it.

Find ingredient quantities that are almost certainly wrong, and say what they should be.

Only flag something when the amount would clearly ruin the dish or is obviously a slip of the pen — a leavening agent measured in cups, an extract measured in cups, a quantity that contradicts the method, a unit that cannot apply to that ingredient. Baking is the usual place this matters.

Do NOT flag:
- amounts that are merely unusual, generous or old-fashioned
- anything you would only change to suit your own taste
- units you would personally prefer (cups to grams, and so on)
- missing information — absent is not wrong

Return ONLY a JSON object:
{ "fixes": [ { "id": "<ingredient id>", "quantity": <number or null>, "unit": "<short unit>", "why": "<one short sentence>" } ] }

An empty list is the correct and common answer. Write "why" in the same language as the recipe.

The recipe:
`;

/** Just enough of the recipe to check, with ids so fixes can be matched back. */
export function reviewBrief(content: RecipeContent, title: string): string {
  const lines = [`Title: ${title}`, "Ingredients:"];
  for (const g of content.ingredientGroups) {
    if (g.heading) lines.push(`  [${g.heading}]`);
    for (const i of g.items) {
      const amount = [i.quantity ?? "", i.unit].filter(Boolean).join(" ").trim();
      lines.push(`  id=${i.id} | ${amount || "(no amount)"} | ${i.name}${i.note ? ` (${i.note})` : ""}`);
    }
  }
  lines.push("Method:");
  for (const g of content.stepGroups) {
    for (const s of g.items) lines.push(`  - ${s.text}`);
  }
  return lines.join("\n");
}

/**
 * Validates proposed fixes against the recipe they claim to be about.
 *
 * An id the recipe doesn't have, or a "fix" identical to what's already there,
 * is dropped rather than shown — a suggestion that changes nothing wastes the
 * reader's attention and makes the useful ones harder to see.
 */
export function parseFixes(raw: string, content: RecipeContent): Fix[] {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    return [];
  }
  const list = (data as { fixes?: unknown })?.fixes;
  if (!Array.isArray(list)) return [];

  const byId = new Map(
    content.ingredientGroups.flatMap((g) => g.items).map((i) => [i.id, i] as const),
  );

  const out: Fix[] = [];
  for (const item of list) {
    const f = (item ?? {}) as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id : "";
    const current = byId.get(id);
    if (!current) continue;

    const unit = typeof f.unit === "string" ? f.unit.trim().slice(0, 24) : "";
    const q =
      f.quantity === null
        ? null
        : typeof f.quantity === "number" && Number.isFinite(f.quantity) && f.quantity >= 0
          ? f.quantity
          : undefined;
    if (q === undefined) continue;

    if (q === current.quantity && unit === current.unit) continue; // changes nothing

    const why = typeof f.why === "string" ? f.why.trim().slice(0, 200) : "";
    if (!why) continue; // an unexplained change is not something to accept

    out.push({
      ingredientId: id,
      from: [current.quantity ?? "", current.unit].filter(Boolean).join(" ").trim() || "—",
      quantity: q,
      unit,
      why,
    });
  }
  return out;
}
