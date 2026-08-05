// Splits a chord symbol into the parts needed to render it in the classic
// jazz lead-sheet ("Real Book") style:
//   - root:    full-size note + accidental
//   - quality: letter quality that stays on the baseline (m, maj, dim, sus…)
//   - sup:     numbers / alterations raised as a superscript (7, 9, 13, b5…)
//   - bass:    optional slash bass note
//
//   "Fm7"     → { root: "F",  quality: "m",   sup: "7",     bass: null }
//   "Ebmaj7"  → { root: "Eb", quality: "maj", sup: "7",     bass: null }
//   "Bb13(b9)"→ { root: "Bb", quality: "",    sup: "13(b9)",bass: null }
//   "Dm7/G"   → { root: "D",  quality: "m",   sup: "7",     bass: "G" }
//   "G"       → { root: "G",  quality: "",    sup: "",      bass: null }

export interface ChordParts {
  root: string;
  quality: string;
  sup: string;
  bass: string | null;
}

export function splitChord(chord: string): ChordParts {
  const trimmed = chord.trim();

  // Separate a slash bass note ("/G", "/F#") from the main chord.
  let main = trimmed;
  let bass: string | null = null;
  const slash = trimmed.match(/^(.*)\/([A-G][#b♯♭]?)$/);
  if (slash) {
    main = slash[1];
    bass = slash[2];
  }

  // Root = leading note letter + optional accidental.
  const rootMatch = main.match(/^([A-G][#b♯♭]?)(.*)$/);
  if (!rootMatch) {
    // Not a standard chord (e.g. "N.C.") — leave it whole.
    return { root: "", quality: "", sup: "", bass };
  }

  // Split the remainder into a baseline letter quality (everything up to the
  // first digit) and a raised superscript (from the first digit onward).
  const rest = rootMatch[2];
  const extMatch = rest.match(/^(\D*?)(\d.*)$/);
  const quality = extMatch ? extMatch[1] : rest;
  const sup = extMatch ? extMatch[2] : "";

  return { root: rootMatch[1], quality, sup, bass };
}

/** Replace plain b/# accidentals with proper ♭/♯ glyphs for display. */
export function prettyAccidentals(s: string): string {
  return s.replace(/b/g, "♭").replace(/#/g, "♯");
}
