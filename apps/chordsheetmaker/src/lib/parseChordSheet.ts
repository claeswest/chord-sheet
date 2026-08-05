import type { SongLine, LyricLine, SectionHeader, ChordToken } from "@/types/song";

const genId = () => Math.random().toString(36).slice(2, 10);

// Matches a single chord token: e.g. Am, G7, Cmaj7, D/F#, Bb, F#m, Dsus2, Cadd9
const CHORD_RE =
  /\b[A-G][#b]?(maj7|maj9|maj|min7|min|m7|m9|m|dim7|dim|aug|sus2|sus4|sus|add9|add|7|9|11|13|6|5)?(\([^)]*\))?(\/[A-G][#b]?)?\b/g;

/**
 * Heuristic: a line is a "chord line" if it contains at least one chord token
 * and the non-chord, non-whitespace content is less than 30% of total content.
 */
function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const chordMatches = [...trimmed.matchAll(CHORD_RE)];
  if (chordMatches.length === 0) return false;

  const chordChars = chordMatches.reduce((sum, m) => sum + m[0].length, 0);
  const nonWhitespace = trimmed.replace(/\s+/g, "").length;

  // Chord chars must make up >60% of non-whitespace content
  return chordChars / nonWhitespace > 0.6;
}

/** Known section header keywords (any language welcome via the bracket rule below) */
const SECTION_KEYWORD_RE =
  /^\s*\[?(?:intro|verse\s*\d*|pre-?chorus|chorus|bridge|outro|solo|interlude|instrumental|hook|refrain|tag|coda|breakdown)\]?\s*$/i;

/**
 * Also treat any line that is ENTIRELY wrapped in [brackets] as a section,
 * as long as it is short (≤ 30 chars inside) and doesn't look like an inline
 * chord annotation (i.e. content doesn't start with a chord root A-G).
 * Catches e.g. [Refräng], [Vers 1], [Brygga], [Omkvæd] etc.
 */
const BRACKETED_LABEL_RE = /^\[([^\]]{1,30})\]$/;

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (SECTION_KEYWORD_RE.test(trimmed)) return true;
  const m = trimmed.match(BRACKETED_LABEL_RE);
  if (m) {
    // Exclude if it looks like a chord: starts with A-G optionally followed by chord suffix
    const inner = m[1].trim();
    if (/^[A-G][#b]?(maj|min|m|dim|aug|sus|add|\d|\/|$)/i.test(inner)) return false;
    // Exclude if it contains multiple words that look like lyrics (> 4 words)
    if (inner.split(/\s+/).length > 4) return false;
    return true;
  }
  return false;
}

/**
 * Extract chord tokens from a chord line, preserving their column positions.
 * Column position = character index into the chord line string.
 */
function extractChords(chordLine: string): ChordToken[] {
  CHORD_RE.lastIndex = 0;
  const tokens: ChordToken[] = [];
  for (const match of chordLine.matchAll(CHORD_RE)) {
    tokens.push({
      id: genId(),
      chord: match[0],
      position: match.index ?? 0,
    });
  }
  return tokens;
}

/**
 * Parse raw chord sheet text into structured SongLine[].
 *
 * Handles the standard format:
 *   Am          G       C
 *   Hello darkness, my old friend
 *
 * Also handles inline chords: [Am]Hello [G]darkness
 * And section headers: [Verse 1] or Chorus:
 */
export function parseChordSheet(text: string): SongLine[] {
  const rawLines = text.split(/\r?\n/);
  const result: SongLine[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    // Blank line — skip
    if (!trimmed) {
      i++;
      continue;
    }

    // Section header
    if (isSectionHeader(trimmed)) {
      const label = trimmed
        .replace(/[\[\]:]/g, "")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      result.push({ id: genId(), type: "section", label });
      i++;
      continue;
    }

    // Chord line — look ahead for a lyric line
    if (isChordLine(raw)) {
      const chords = extractChords(raw);
      const nextRaw = rawLines[i + 1];
      const nextTrimmed = nextRaw?.trim() ?? "";

      if (nextTrimmed && !isChordLine(nextRaw) && !isSectionHeader(nextTrimmed)) {
        // Pair with lyric below
        result.push({
          id: genId(),
          type: "lyric",
          text: nextRaw.trimEnd(),
          chords,
        });
        i += 2;
      } else {
        // Standalone chord line (e.g. instrumental break) — add as chord-only lyric
        result.push({
          id: genId(),
          type: "lyric",
          text: "",
          chords,
        });
        i++;
      }
      continue;
    }

    // Lyric line with inline chord brackets: [Am]Hello [G]world
    if (/\[[A-G][^\]]*\]/.test(trimmed)) {
      const chords: ChordToken[] = [];
      let lyric = "";
      let offset = 0;
      const inlineRe = /\[([A-G][^\]]*)\]([^\[]*)/g;
      let match;
      inlineRe.lastIndex = 0;
      let lastEnd = 0;

      // Prepend any text before first bracket
      const firstBracket = trimmed.indexOf("[");
      if (firstBracket > 0) {
        lyric += trimmed.slice(0, firstBracket);
        offset += firstBracket;
        lastEnd = firstBracket;
      }

      while ((match = inlineRe.exec(trimmed)) !== null) {
        const [, chord, text] = match;
        chords.push({ id: genId(), chord, position: offset });
        lyric += text;
        offset += text.length;
        lastEnd = match.index + match[0].length;
      }

      // Any trailing text after last match
      if (lastEnd < trimmed.length) {
        lyric += trimmed.slice(lastEnd);
      }

      result.push({ id: genId(), type: "lyric", text: lyric, chords });
      i++;
      continue;
    }

    // Plain lyric line
    result.push({ id: genId(), type: "lyric", text: raw.trimEnd(), chords: [] });
    i++;
  }

  return result.length > 0
    ? result
    : [{ id: genId(), type: "lyric", text: "", chords: [] }];
}

// ── #3 Leftover ChordPro-style tokens ────────────────────────────────────────
const INLINE_CHORD_RE = /\[([A-G][#b]?[A-Za-z0-9#b+\-/]{0,10})\]/g;

/**
 * Converts leftover inline "[Em7]" tokens inside lyric text into positioned
 * chord tokens (display-time cleanup — also fixes songs already stored with
 * mixed systems). Existing chord positions are shifted left as text shrinks.
 */
export function extractInlineChords(lines: SongLine[]): SongLine[] {
  let changed = false;
  const out = lines.map((line) => {
    if (line.type !== "lyric" || !line.text.includes("[")) return line;
    let text = line.text;
    const newChords: ChordToken[] = [];
    const shifts: { at: number; len: number }[] = [];
    let m: RegExpExecArray | null;
    INLINE_CHORD_RE.lastIndex = 0;
    while ((m = INLINE_CHORD_RE.exec(text)) !== null) {
      newChords.push({ id: genId(), chord: m[1], position: m.index });
      shifts.push({ at: m.index, len: m[0].length });
    }
    if (newChords.length === 0) return line;
    changed = true;
    // Remove tokens from text (right-to-left so indices stay valid), and trim
    // one following space so lyrics don't gain double spaces.
    for (let i = shifts.length - 1; i >= 0; i--) {
      const { at, len } = shifts[i];
      const extra = text[at + len] === " " ? 1 : 0;
      text = text.slice(0, at) + text.slice(at + len + extra);
      shifts[i].len = len + extra;
    }
    // Re-map positions: subtract lengths of all tokens removed before them
    const remap = (pos: number) => {
      let d = 0;
      for (const sh of shifts) if (sh.at < pos) d += Math.min(sh.len, pos - sh.at);
      return Math.max(0, pos - d);
    };
    const merged = [
      ...line.chords.map((c) => ({ ...c, position: remap(c.position) })),
      ...newChords.map((c) => ({ ...c, position: remap(c.position + 0.0) })),
    ].sort((a, b) => a.position - b.position);
    return { ...line, text, chords: merged };
  });
  return changed ? out : lines;
}
