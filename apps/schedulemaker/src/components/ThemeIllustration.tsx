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
// Two rounds went into these. A second set was drawn elsewhere from the same
// brief, and both were rendered side by side on every style's paper and in
// ink-saving, at print size and at 40px. The plane, slate, sweet and sun came
// from that set — the slate reads as a school chalkboard where the first read
// as a screen, and the sweet keeps its stripes in black and white. The moon,
// daisy, book and quill stayed: that set's daisy had four petals and read as a
// clover, its quill had no nib and read as a leaf. What the second set got
// right everywhere was weight, so all eight share its heavier stroke now
// (2.8, in the stylesheet); mixed weights would not have looked like a family.
//
// The markup is static and written here, never built from input, which is why
// it is set as HTML rather than spelled out as JSX.

const DRAWINGS: Record<string, { svg: string; pop: string }> = {
  // Papper — a paper plane with its flight trail.
  "": {
    pop: "#ffffff",
    svg: `<path class="l f" d="M17 13 54 28 34 34 26 51 17 13Z"/>
      <path class="l" d="m17 13 17 21"/>
      <path class="l" stroke-dasharray="3 6" d="M27 44C17 50 7 46 8 36c.7-6 6-9 11-7"/>`,
  },
  // Krita — a chalkboard on an easel, a tick on the board, chalk on the ledge.
  chalk: {
    pop: "#79b58a",
    svg: `<path class="l p" d="M14 12h36v29H14z"/>
      <path class="l" d="M19 41 13 55m32-14 6 14M26 41l-3 14m15-14 3 14M11 45h42"/>
      <path class="l f" d="M37 41h10v4H37z"/>
      <path class="l" d="m22 24 6 5 13-10"/>`,
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
  // Godis — a wrapped sweet with stripes.
  candy: {
    pop: "#e98fa7",
    svg: `<path class="l f" d="m18 25-10-7 2 11-2 11 10-5m28-10 10-7-2 11 2 11-10-5"/>
      <rect class="l p" x="17" y="20" width="30" height="18" rx="7"/>
      <path class="l" d="m25 23-4 12m12-12-4 12m12-12-4 12"/>`,
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
  // Lekfull — a smiling sun. The eyes are zero-length strokes: round caps
  // turn them into dots, and they stay dots in ink-saving.
  playful: {
    pop: "#f2c866",
    svg: `<path class="l" d="M32 5v6m0 42v6M5 32h6m42 0h6M13 13l5 5m28 28 5 5m0-38-5 5M18 46l-5 5"/>
      <circle class="l p" cx="32" cy="32" r="16"/>
      <path class="l" d="M25 28h.1M39 28h.1M24 36c4 6 12 6 16 0"/>`,
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
