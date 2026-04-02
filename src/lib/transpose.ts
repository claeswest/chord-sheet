// Chromatic scale — sharps by default, flats as alternate spellings
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Notes that prefer flat spellings in common keys
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Db", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

function noteIndex(note: string): number {
  const i = SHARPS.indexOf(note);
  if (i !== -1) return i;
  return FLATS.indexOf(note);
}

function shiftNote(note: string, semitones: number, preferFlats: boolean): string {
  const idx = noteIndex(note);
  if (idx === -1) return note; // unknown note, leave as-is
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return preferFlats ? FLATS[newIdx] : SHARPS[newIdx];
}

/**
 * Detects whether a chord collection is better expressed with flats.
 * Used to decide how to spell transposed chords.
 */
function shouldUseFlats(chords: string[]): boolean {
  const flatCount = chords.filter((c) => c.includes("b") && !c.startsWith("B")).length;
  const sharpCount = chords.filter((c) => c.includes("#")).length;
  return flatCount > sharpCount;
}

/**
 * Transpose a single chord string by `semitones`.
 * Handles: Am, G7, Cmaj7, D/F#, Bb, F#m, Dsus2, etc.
 */
export function transposeChord(chord: string, semitones: number, preferFlats: boolean): string {
  if (semitones === 0) return chord;

  // Match root note (with optional sharp/flat) + rest of chord quality + optional slash bass
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, quality] = match;

  // Check for slash chord bass note at the end: e.g. D/F#
  const slashMatch = quality.match(/^(.*)\/(([A-G][#b]?))$/);
  if (slashMatch) {
    const [, qual, , bass] = slashMatch;
    const newRoot = shiftNote(root, semitones, preferFlats);
    const newBass = shiftNote(bass, semitones, preferFlats);
    return `${newRoot}${qual}/${newBass}`;
  }

  return shiftNote(root, semitones, preferFlats) + quality;
}

/**
 * Transpose all chords in a SongLine[] by `semitones`.
 */
import type { SongLine } from "@/types/song";

export function transposeSong(lines: SongLine[], semitones: number): SongLine[] {
  if (semitones === 0) return lines;

  // Collect all chord names to decide flat vs sharp preference
  const allChords: string[] = [];
  for (const line of lines) {
    if (line.type === "lyric") {
      allChords.push(...line.chords.map((c) => c.chord));
    }
  }
  const preferFlats = shouldUseFlats(allChords);

  return lines.map((line) => {
    if (line.type !== "lyric") return line;
    return {
      ...line,
      chords: line.chords.map((c) => ({
        ...c,
        chord: transposeChord(c.chord, semitones, preferFlats),
      })),
    };
  });
}

/** Human-readable key name from semitone offset, e.g. +2 = "up 2" */
export function semitoneLabel(semitones: number): string {
  if (semitones === 0) return "Original";
  const abs = Math.abs(semitones);
  const dir = semitones > 0 ? "▲" : "▼";
  return `${dir} ${abs}`;
}

export const NOTE_NAMES = SHARPS;
