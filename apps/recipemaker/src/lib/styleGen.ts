// Generating a canvas style for one recipe.
//
// The model's job is taste; this file's job is making sure taste can't produce
// a recipe you cannot read. Everything it returns is treated as untrusted:
// colours must be hex, fonts must be keys we actually load, and the
// combinations must clear WCAG contrast against the background it chose.
//
// Contrast is checked rather than trusted because it is exactly the thing a
// model gets wrong while sounding confident — "sage on cream" is charming
// right up until the ink is 2.1:1 and the method is unreadable on a worktop.

import {
  type CanvasStyle,
  DEFAULT_STYLE,
  BODY_FONT_KEYS,
  FONT_KEYS,
  contrast,
  isHexColor,
  resolveFont,
} from "@/lib/canvasStyle";

/** Body text is read at arm's length in bad kitchen light — AAA, not AA. */
const INK_MIN = 7;
/** Supporting colours: AA for normal text. */
const SUPPORT_MIN = 4.5;

export const STYLE_PROMPT = `You are designing how ONE recipe looks on the page — its own colours and typography, like a page from a cookbook.

Return ONLY a JSON object, no markdown fence, no commentary:
{
  "bg": "#rrggbb",      // page background — light and warm, never pure white
  "ink": "#rrggbb",     // body text
  "muted": "#rrggbb",   // description, ingredient notes
  "accent": "#rrggbb",  // section headings and the step-number circles
  "qty": "#rrggbb",     // ingredient quantities
  "rule": "#rrggbb",    // hairline between ingredient lines
  "display": one of the heading faces below,
  "body": one of the body faces below
}

Heading faces:
- "fraunces"  — warm, characterful serif; good for home cooking and baking
- "playfair"  — high contrast and formal; good for something special or classic
- "lora"      — quiet serif, understated
- "worksans"  — clean sans; modern, everyday
- "caveat"    — handwriting; good for a family or handed-down recipe
- "serif", "sans", "rounded", "mono" — plain system faces

Body faces (a method gets read from a worktop, so no handwriting and no mono):
- "lora", "fraunces", "playfair", "worksans", "serif", "sans", "rounded"

Requirements — a style that fails these is rejected:
- All six colours MUST be 6-digit hex.
- ink on bg must reach a WCAG contrast ratio of at least ${INK_MIN}:1.
- muted, accent and qty on bg must each reach at least ${SUPPORT_MIN}:1.
- rule is a hairline: keep it close to bg, no contrast requirement.
- display and body must be exactly one of the keys listed above, written the
  same way. Never a font name of your own — a face that isn't on the list is
  not installed, and the recipe would silently fall back to something plain.

Take the mood from the recipe itself — what it is, where it comes from, when you would cook it. A summer salad and a winter stew should not look alike. Prefer restrained, printable palettes over bright screen colours.`;

export type StyleIssue = string;

/**
 * Validates a generated style. Returns the style, or the list of reasons it
 * was rejected — the caller feeds those back to the model for one retry.
 */
export function validateStyle(raw: unknown): { style: CanvasStyle } | { issues: StyleIssue[] } {
  const issues: StyleIssue[] = [];
  if (!raw || typeof raw !== "object") return { issues: ["Output was not a JSON object."] };
  const r = raw as Record<string, unknown>;

  const colors = ["bg", "ink", "muted", "accent", "qty", "rule"] as const;
  for (const k of colors) {
    if (!isHexColor(r[k])) issues.push(`${k} must be a hex colour like #f4ece0 (got ${JSON.stringify(r[k])}).`);
  }
  if (typeof r.display !== "string" || !FONT_KEYS.includes(r.display)) {
    issues.push(`display must be one of ${FONT_KEYS.join(", ")} (got ${JSON.stringify(r.display)}).`);
  }
  // Body is the narrower list: a method set in handwriting is unreadable at
  // arm's length, and the model reaches for it when a recipe sounds nostalgic.
  if (typeof r.body !== "string" || !BODY_FONT_KEYS.includes(r.body)) {
    issues.push(
      `body must be one of ${BODY_FONT_KEYS.join(", ")} (got ${JSON.stringify(r.body)}).`,
    );
  }
  if (issues.length) return { issues };

  const bg = (r.bg as string).trim();
  const check = (k: "ink" | "muted" | "accent" | "qty", min: number) => {
    const ratio = contrast(r[k] as string, bg);
    if (ratio < min) {
      issues.push(`${k} (${r[k]}) on bg (${bg}) is ${ratio.toFixed(1)}:1, needs ${min}:1.`);
    }
  };
  check("ink", INK_MIN);
  check("muted", SUPPORT_MIN);
  check("accent", SUPPORT_MIN);
  check("qty", SUPPORT_MIN);
  if (issues.length) return { issues };

  return {
    style: {
      bg,
      ink: (r.ink as string).trim(),
      muted: (r.muted as string).trim(),
      accent: (r.accent as string).trim(),
      qty: (r.qty as string).trim(),
      rule: (r.rule as string).trim(),
      display: resolveFont(r.display),
      body: resolveFont(r.body),
    },
  };
}

/** A short description of the recipe — enough to style it, not the whole thing. */
export function styleBrief(r: {
  title: string;
  description?: string | null;
  source?: string | null;
  ingredients: string[];
}): string {
  const lines = [`Title: ${r.title}`];
  if (r.description) lines.push(`Description: ${r.description}`);
  if (r.source) lines.push(`Source: ${r.source}`);
  if (r.ingredients.length) {
    lines.push(`Main ingredients: ${r.ingredients.slice(0, 12).join(", ")}`);
  }
  return lines.join("\n");
}

export { DEFAULT_STYLE };
