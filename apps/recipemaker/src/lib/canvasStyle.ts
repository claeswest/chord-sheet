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

// Colours below clear the same contrast bar the generator is held to (see
// styleGen.ts). Three of them originally didn't — HEIRLOOM's quantities sat at
// 3.74:1 against the paper, which matters because quantities are the most
// scanned thing on a recipe and HEIRLOOM is the default. Checking the presets
// against the validator written for the AI is what surfaced it.
export const HEIRLOOM: CanvasStyle = {
  bg: "#f4ece0", ink: "#3b2f24", muted: "#746554", accent: "#965732",
  qty: "#5c6d46", rule: "#ddd0bd",
  display: '"Iowan Old Style", Georgia, serif', body: "Georgia, serif",
};

export const NORDIC: CanvasStyle = {
  bg: "#f7f7f5", ink: "#22252a", muted: "#676d7b", accent: "#557182",
  qty: "#3f6b4f", rule: "#e3e3e0",
  display: "ui-sans-serif, system-ui, sans-serif", body: "ui-sans-serif, system-ui, sans-serif",
};

export const BOTANICAL: CanvasStyle = {
  bg: "#eef2ea", ink: "#1f2a20", muted: "#5c6b58", accent: "#3f6b4f",
  qty: "#8a5a2b", rule: "#d6dfd2",
  display: "Georgia, serif", body: "Georgia, serif",
};

export const DEFAULT_STYLE = HEIRLOOM;

export const PRESETS: Record<string, CanvasStyle> = { HEIRLOOM, NORDIC, BOTANICAL };

/**
 * The fonts a generated style may use.
 *
 * Nunito is the only webfont this app loads (see layout.tsx); everything else
 * here ships with the OS. A generator left to name fonts freely will happily
 * pick Playfair Display, which would silently fall back to a default serif and
 * make the whole feature look broken in a way nobody can debug from the
 * output. So it chooses a KEY from this map and the value is what reaches CSS.
 */
export const FONT_STACKS: Record<string, string> = {
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  rounded: 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace',
};

export const FONT_KEYS = Object.keys(FONT_STACKS);

/** Maps a font key to a real stack; falls back to serif for anything unknown. */
export function resolveFont(key: unknown): string {
  return typeof key === "string" && FONT_STACKS[key] ? FONT_STACKS[key] : FONT_STACKS.serif;
}

/** #abc / #aabbcc / #aabbccdd — the only colour form a generated style may use. */
export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());
}

function channel(hex: string): [number, number, number] {
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channel(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

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
