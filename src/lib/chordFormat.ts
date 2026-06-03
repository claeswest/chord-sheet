// Splits a chord symbol into the parts needed to render it in the classic
// jazz lead-sheet ("Real Book") style: a full-size root + a raised, smaller
// superscript for the quality/extensions, plus an optional slash bass note.
//
//   "Ebma7"   → { root: "Eb", sup: "ma7",  bass: null }
//   "Bb13(b9)"→ { root: "Bb", sup: "13(b9)", bass: null }
//   "Dm7/G"   → { root: "D",  sup: "m7",   bass: "G" }
//   "G"       → { root: "G",  sup: "",      bass: null }

export interface ChordParts {
  root: string;
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
    return { root: "", sup: "", bass };
  }
  return { root: rootMatch[1], sup: rootMatch[2], bass };
}

/** Replace plain b/# accidentals with proper ♭/♯ glyphs for display. */
export function prettyAccidentals(s: string): string {
  return s.replace(/b/g, "♭").replace(/#/g, "♯");
}
