import type { SongLine } from "@/types/song";

// Chromatic scale — sharps by default, flats as alternate spellings
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function noteIndex(note: string): number {
  const i = SHARPS.indexOf(note);
  if (i !== -1) return i;
  return FLATS.indexOf(note);
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Root (with optional accidental), the rest of the chord, and a slash bass if there is one. */
function parseChord(chord: string): { root: string; quality: string; bass: string | null } | null {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const [, root, rest] = match;
  const slash = rest.match(/^(.*)\/([A-G][#b]?)$/);
  return slash ? { root, quality: slash[1], bass: slash[2] } : { root, quality: rest, bass: null };
}

/**
 * Transpose a single chord string by `semitones`, spelled all-sharps or
 * all-flats. Handles: Am, G7, Cmaj7, D/F#, Bb, F#m, Dsus2, etc.
 *
 * This is the blunt version, for one chord on its own. A whole song goes
 * through transposeSong, which spells for the key it lands in.
 */
export function transposeChord(chord: string, semitones: number, preferFlats: boolean): string {
  if (semitones === 0) return chord;
  return respell(chord, semitones, (pc) => (preferFlats ? FLATS[pc] : SHARPS[pc]));
}

function respell(chord: string, semitones: number, name: (pitchClass: number) => string): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const shift = (note: string) => {
    const idx = noteIndex(note);
    return idx === -1 ? note : name(mod12(idx + semitones)); // unknown note: leave as-is
  };
  return shift(parsed.root) + parsed.quality + (parsed.bass ? `/${shift(parsed.bass)}` : "");
}

// ── Spelling for a key ──────────────────────────────────────────────────────
//
// Which name a black key gets depends on the key the song is in: the same
// pitch is Bb in F and A# in B. This used to be decided from how the chords
// were spelled *before* transposing — so a song in Am, with no accidentals to
// vote, went up three semitones as "Cm A# D#" where anyone would write
// "Cm Bb Eb".
//
// Notes are placed on the line of fifths (… Eb Bb F C G D A E B F# C# …).
// A key's own notes and its usual neighbours are the twelve positions around
// its tonic, so every pitch is spelled with the name that sits in that window.

/** Where each major key sits on the line of fifths, by the pitch class of its tonic. */
const KEY_POSITION = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
//                    C  Db  D  Eb  E  F  F#  G  Ab  A  Bb  B

const FIFTHS_LETTERS = ["F", "C", "G", "D", "A", "E", "B"];

function nameInKey(pitchClass: number, keyPosition: number): string {
  let pos = mod12(pitchClass * 7);
  while (pos > keyPosition + 6) pos -= 12;
  while (pos < keyPosition - 5) pos += 12;
  // Theory would now and then ask for E#, B#, Cb or a double flat. Nobody
  // reading a chord chart wants those: use the plain name.
  if (pos > 10) pos -= 12;
  if (pos < -6) pos += 12;
  const letter = FIFTHS_LETTERS[(((pos + 1) % 7) + 7) % 7];
  const accidental = Math.floor((pos + 1) / 7);
  return letter + (accidental > 0 ? "#" : accidental < 0 ? "b" : "");
}

type Triad = "major" | "minor" | "dim";
function triadOf(quality: string): Triad {
  if (/^(dim|°|o(?![a-z]))|^m7b5/.test(quality)) return "dim";
  if (/^m(?!aj)/.test(quality) || /^min/.test(quality)) return "minor";
  return "major";
}

/**
 * The key a set of chords is most at home in, as the pitch class of the major
 * key with that signature, and whether the song reads as its relative minor.
 * A chord chart's key: the one most of its chords belong to, leaning on where
 * the song starts and ends.
 */
function detectKey(chords: string[]): { tonic: number; minor: boolean } | null {
  const parsed = chords
    .map(parseChord)
    .filter((c): c is NonNullable<ReturnType<typeof parseChord>> => !!c && noteIndex(c.root) !== -1)
    .map((c) => ({ pc: noteIndex(c.root), triad: triadOf(c.quality) }));
  if (parsed.length === 0) return null;

  const degreeIn = (c: { pc: number; triad: Triad }, tonic: number) => {
    const d = mod12(c.pc - tonic);
    if (c.triad === "major") return d === 0 ? "I" : d === 5 ? "IV" : d === 7 ? "V" : null;
    if (c.triad === "minor") return d === 2 ? "ii" : d === 4 ? "iii" : d === 9 ? "vi" : null;
    return d === 11 ? "vii" : null;
  };
  const isHome = (c: { pc: number; triad: Triad }, tonic: number) => {
    const d = degreeIn(c, tonic);
    return d === "I" || d === "vi";
  };

  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  let best = { tonic: 0, score: -1 };
  for (let tonic = 0; tonic < 12; tonic++) {
    let score = parsed.filter((c) => degreeIn(c, tonic)).length;
    if (isHome(first, tonic)) score += 1.5;
    if (isHome(last, tonic)) score += 1;
    // On a tie, the key with fewer accidentals.
    if (score > best.score || (score === best.score && Math.abs(KEY_POSITION[tonic]) < Math.abs(KEY_POSITION[best.tonic]))) {
      best = { tonic, score };
    }
  }
  const home = degreeIn(first, best.tonic) ?? degreeIn(last, best.tonic);
  return { tonic: best.tonic, minor: home === "vi" };
}

/**
 * Transpose all chords in a SongLine[] by `semitones`, spelling them for the
 * key the song ends up in.
 */
export function transposeSong(lines: SongLine[], semitones: number): SongLine[] {
  if (semitones === 0) return lines;

  const allChords: string[] = [];
  for (const line of lines) {
    if (line.type === "lyric") allChords.push(...line.chords.map((c) => c.chord));
  }
  const key = detectKey(allChords);
  // No chord we can read: nothing to spell, and nothing to change.
  if (!key) return lines;

  const newTonic = mod12(key.tonic + semitones);
  // F# major and Eb minor share six accidentals with Gb major and D# minor.
  // Written, it is F# for the major key and Eb minor for the minor one.
  const keyPosition = newTonic === 6 && key.minor ? -6 : KEY_POSITION[newTonic];
  const name = (pc: number) => nameInKey(pc, keyPosition);

  return lines.map((line) => {
    if (line.type !== "lyric") return line;
    return {
      ...line,
      chords: line.chords.map((c) => ({ ...c, chord: respell(c.chord, semitones, name) })),
    };
  });
}

/** Human-readable key name from semitone offset, e.g. +2 = "up 2" */
export function semitoneLabel(semitones: number): string {
  if (semitones === 0) return "Transpose";
  const abs = Math.abs(semitones);
  const dir = semitones > 0 ? "▲" : "▼";
  return `${dir} ${abs}`;
}

export const NOTE_NAMES = SHARPS;
