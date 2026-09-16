// A small drawing that belongs to the style: a daisy for Äng, a moon for
// Skymning. Decoration, and meant as decoration — it sits in the top-right
// corner of the header, absolutely positioned, so it takes nothing from the
// schedule, and it can be switched off.
//
// One drawing language for all eight, on a 64 grid: round strokes in the
// style's accent, one soft fill in its accent-soft, and at most one colour of
// the thing's own (a daisy's yellow heart, a moon's pale light). Colours are
// classes, not values, so the stylesheet decides them — which is what lets
// each drawing follow its style, and ink-saving turn every one of them into a
// clean black outline. Fills become paper there rather than nothing: a shape in
// front has to go on hiding what is behind it, or a daisy's petals show
// straight through its centre.
//
// Every one was rendered on its own style's paper and in ink-saving, at full
// size and at 40px, before it was kept. Two were redrawn after that: the
// chalk had crossed an easel leg, and the daisy's leaves ran into its petals.
//
// The markup is static and written here, never built from input, which is why
// it is set as HTML rather than spelled out as JSX.

const DRAWINGS: Record<string, { svg: string; pop: string }> = {
  // Papper — a paper plane.
  "": {
    pop: "#ffffff",
    svg: `<path class="l dash" d="M6 58 C 10 48, 4 42, 14 40 S 22 34, 20 30"/>
      <path class="l f" d="M22 30 L58 10 L32 52 L29 38 Z"/>
      <path class="l p" d="M22 30 L58 10 L29 38 Z"/>
      <path class="l" d="M29 38 L58 10"/>`,
  },
  // Krita — a slate on an easel, chalk on the ledge.
  chalk: {
    pop: "#ffffff",
    svg: `<rect class="l f" x="7" y="8" width="50" height="36" rx="5"/>
      <path class="l" d="M15 28 c3 -7 6 7 9 0 s6 7 9 0 s6 7 9 0"/>
      <path class="l" d="M15 18 h10"/>
      <path class="l" d="M4 50 H 60"/>
      <rect class="l p" x="38" y="44.5" width="14" height="5.5" rx="2"/>
      <path class="l" d="M20 50 l-5 10 M44 50 l5 10"/>`,
  },
  // Skymning — a crescent moon and stars.
  dusk: {
    pop: "#f6e3a1",
    svg: `<path class="l p" d="M40 8 A 22 22 0 1 0 58 42 A 17 17 0 1 1 40 8 Z"/>
      <path class="l p" d="M14 8 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z"/>
      <path class="l p" d="M52 50 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z"/>
      <circle class="p" cx="10" cy="40" r="1.8"/>`,
  },
  // Äng — a daisy.
  meadow: {
    pop: "#f5c542",
    svg: `<path class="l" d="M32 34 C 32 44, 30 52, 31 61"/>
      <path class="l f" d="M31 57 C 22 57, 17 51, 16 45 C 24 45, 30 49, 31 57 Z"/>
      <path class="l f" d="M32 54 C 40 53, 45 48, 47 42 C 39 42, 33 46, 32 54 Z"/>
      <g class="l w">
        <ellipse cx="32" cy="12" rx="5" ry="8"/>
        <ellipse cx="32" cy="12" rx="5" ry="8" transform="rotate(60 32 24)"/>
        <ellipse cx="32" cy="12" rx="5" ry="8" transform="rotate(120 32 24)"/>
        <ellipse cx="32" cy="12" rx="5" ry="8" transform="rotate(180 32 24)"/>
        <ellipse cx="32" cy="12" rx="5" ry="8" transform="rotate(240 32 24)"/>
        <ellipse cx="32" cy="12" rx="5" ry="8" transform="rotate(300 32 24)"/>
      </g>
      <circle class="l p" cx="32" cy="24" r="6"/>
      <path class="l" d="M10 61 l2 -6 l2 6 M50 61 l2 -7 l2 7"/>`,
  },
  // Godis — a wrapped sweet.
  candy: {
    pop: "#ff8fb8",
    svg: `<g transform="rotate(-25 32 32)">
        <path class="l f" d="M22 32 L7 21 L11 32 L7 43 Z"/>
        <path class="l f" d="M42 32 L57 21 L53 32 L57 43 Z"/>
        <circle class="l p" cx="32" cy="32" r="12"/>
        <path class="w-line" d="M25 23 C 30 30, 30 36, 26 42 M34 21 C 39 28, 40 36, 36 43"/>
      </g>`,
  },
  // Skolbok — an open book with a ribbon.
  schoolbook: {
    pop: "#e5484d",
    svg: `<path class="l f" d="M32 18 C 24 12, 14 12, 7 16 V 50 C 14 46, 24 46, 32 52 Z"/>
      <path class="l f" d="M32 18 C 40 12, 50 12, 57 16 V 50 C 50 46, 40 46, 32 52 Z"/>
      <path class="l" d="M13 24 c5 -2 10 -2 14 0 M13 31 c5 -2 10 -2 14 0 M13 38 c5 -2 10 -2 14 0"/>
      <path class="l" d="M37 24 c4 -2 9 -2 14 0 M37 31 c4 -2 9 -2 14 0"/>
      <path class="l p" d="M44 46 V 60 L47 57 L50 60 V 45"/>`,
  },
  // Klassisk — a quill.
  classic: {
    pop: "#30261b",
    svg: `<path class="l f" d="M54 6 C 34 8, 18 24, 15 46 C 32 44, 50 30, 54 6 Z"/>
      <path class="l" d="M52 9 L 9 58"/>
      <path class="l" d="M42 19 l-8 -1 M36 26 l-9 0 M30 33 l-8 1 M44 22 l1 8 M38 29 l2 9"/>
      <path class="l" d="M6 60 c3 -1 6 -4 7 -8"/>`,
  },
  // Lekfull — a smiling sun.
  playful: {
    pop: "#ffd54a",
    svg: `<path class="l" d="M32 3 v7 M32 54 v7 M3 32 h7 M54 32 h7 M11.5 11.5 l5 5 M47.5 47.5 l5 5 M52.5 11.5 l-5 5 M16.5 47.5 l-5 5"/>
      <circle class="l p" cx="32" cy="32" r="15"/>
      <circle class="ink" cx="26.5" cy="29" r="1.8"/>
      <circle class="ink" cx="37.5" cy="29" r="1.8"/>
      <path class="l" d="M25 36 c3 4 11 4 14 0"/>`,
  },
};

export default function ThemeIllustration({ theme }: { theme: string }) {
  const drawing = DRAWINGS[theme];
  // A style added later without a drawing gets none, rather than another
  // style's — a paper plane on a meadow is a mistake, not a default.
  if (!drawing) return null;
  return (
    <svg
      className="sheet-illo"
      viewBox="0 0 64 64"
      aria-hidden
      focusable="false"
      style={{ ["--pop" as string]: drawing.pop }}
      dangerouslySetInnerHTML={{ __html: drawing.svg }}
    />
  );
}
