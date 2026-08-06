// The canvas style — how a recipe itself looks, as opposed to the app around
// it. See design/canvas/spec.html.
//
// This lives in lib/ rather than inside a component because three places need
// it: the landing page samples, the cook view, and (once it exists) the AI that
// generates a style per recipe into Recipe.style. The contract is the set of
// --c-* variables below; anything that can produce those can style a recipe.

import type { CSSProperties } from "react";

export type CanvasStyle = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  qty: string;
  rule: string;
  display: string;
  body: string;
};

export const HEIRLOOM: CanvasStyle = {
  bg: "#f4ece0", ink: "#3b2f24", muted: "#7a6a58", accent: "#9c5b34",
  qty: "#6c7f52", rule: "#ddd0bd",
  display: '"Iowan Old Style", Georgia, serif', body: "Georgia, serif",
};

export const NORDIC: CanvasStyle = {
  bg: "#f7f7f5", ink: "#22252a", muted: "#6b7280", accent: "#5b7a8c",
  qty: "#3f6b4f", rule: "#e3e3e0",
  display: "ui-sans-serif, system-ui, sans-serif", body: "ui-sans-serif, system-ui, sans-serif",
};

export const BOTANICAL: CanvasStyle = {
  bg: "#eef2ea", ink: "#1f2a20", muted: "#5c6b58", accent: "#3f6b4f",
  qty: "#8a5a2b", rule: "#d6dfd2",
  display: "Georgia, serif", body: "Georgia, serif",
};

export const DEFAULT_STYLE = HEIRLOOM;

const KEYS = ["bg", "ink", "muted", "accent", "qty", "rule", "display", "body"] as const;

/**
 * Reads Recipe.style (an untyped JSON column) into a CanvasStyle.
 *
 * Every field falls back individually rather than rejecting the whole object:
 * a style with a colour the generator got wrong should still contribute its
 * good fields. Values are length-capped because they go straight into a style
 * attribute — a font stack is a short string, and anything longer is either a
 * mistake or an attempt to smuggle in CSS.
 */
export function parseStyle(raw: unknown): CanvasStyle {
  if (!raw || typeof raw !== "object") return DEFAULT_STYLE;
  const r = raw as Record<string, unknown>;
  const out = { ...DEFAULT_STYLE };
  for (const k of KEYS) {
    const v = r[k];
    if (typeof v !== "string") continue;
    const s = v.trim();
    // No braces, semicolons or url() — those only appear if something is
    // trying to break out of the property value it was written into.
    if (!s || s.length > 120 || /[;{}]|url\(|expression\(/i.test(s)) continue;
    out[k] = s;
  }
  return out;
}

/** The --c-* custom properties a styled recipe reads. */
export function styleVars(s: CanvasStyle): CSSProperties {
  return {
    "--c-bg": s.bg,
    "--c-ink": s.ink,
    "--c-muted": s.muted,
    "--c-accent": s.accent,
    "--c-qty": s.qty,
    "--c-rule": s.rule,
    "--c-display": s.display,
    "--c-body": s.body,
    background: "var(--c-bg)",
    color: "var(--c-ink)",
  } as CSSProperties;
}

/** ½ reads better than 0.5 on a recipe. */
export function pretty(q: number): string {
  return q === 0.5 ? "½" : q === 0.25 ? "¼" : q === 0.75 ? "¾" : String(q);
}

/** "1 dl", "3", "—" — the left column of an ingredient line. */
export function amount(quantity: number | null, unit: string): string {
  if (quantity == null) return unit ? unit : "—";
  return `${pretty(quantity)}${unit ? ` ${unit}` : ""}`;
}
