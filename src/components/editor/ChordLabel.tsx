import { splitChord, prettyAccidentals } from "@/lib/chordFormat";

interface Props {
  chord: string;
  /** When true, render in jazz lead-sheet style (superscript extensions). */
  jazz?: boolean;
}

/**
 * Renders a chord symbol. In jazz/"Real Book" mode the root is full size and
 * the quality/extensions are raised as a smaller superscript (e.g. E♭ᵐᵃ⁷),
 * with proper ♭/♯ glyphs. Otherwise the chord is rendered as plain text.
 */
export default function ChordLabel({ chord, jazz }: Props) {
  if (!jazz) return <>{chord}</>;

  const { root, quality, sup, bass } = splitChord(chord);

  // Unparseable symbol (e.g. "N.C.") — render as-is.
  if (!root) return <>{prettyAccidentals(chord)}</>;

  return (
    <>
      {prettyAccidentals(root)}
      {quality && prettyAccidentals(quality)}
      {sup && (
        <span style={{ fontSize: "0.72em", verticalAlign: "0.28em", lineHeight: 1 }}>
          {prettyAccidentals(sup)}
        </span>
      )}
      {bass && <>/{prettyAccidentals(bass)}</>}
    </>
  );
}
