import { describe, expect, it } from "vitest";
import type { SongLine } from "@/types/song";
import { songKey, transposeChord, transposeSong } from "./transpose";

/** A song from rows of chords: one lyric line per row, with a section header first. */
function song(...rows: string[][]): SongLine[] {
  const lines: SongLine[] = [{ id: "s", type: "section", label: "Verse" }];
  rows.forEach((chords, r) => {
    lines.push({
      id: `l${r}`,
      type: "lyric",
      text: "words to sing over these chords",
      chords: chords.map((chord, c) => ({ id: `c${r}-${c}`, chord, position: c * 6 })),
    });
  });
  return lines;
}

/** Every chord of a song, in order. */
function chordsOf(lines: SongLine[]): string[] {
  return lines.flatMap((l) => (l.type === "lyric" ? l.chords.map((c) => c.chord) : []));
}

describe("transposeChord", () => {
  it("moves the root and keeps the rest of the chord", () => {
    expect(transposeChord("C", 2, false)).toBe("D");
    expect(transposeChord("Am", 2, false)).toBe("Bm");
    expect(transposeChord("G7", 2, false)).toBe("A7");
    expect(transposeChord("Cmaj7", 5, false)).toBe("Fmaj7");
    expect(transposeChord("Dsus2", -2, false)).toBe("Csus2");
  });

  it("spells a black key as asked", () => {
    expect(transposeChord("A", 1, false)).toBe("A#");
    expect(transposeChord("A", 1, true)).toBe("Bb");
  });

  it("moves the bass of a slash chord with the chord", () => {
    expect(transposeChord("D/F#", 2, false)).toBe("E/G#");
    expect(transposeChord("C/E", 5, true)).toBe("F/A");
  });

  it("wraps round the octave in both directions", () => {
    expect(transposeChord("B", 1, false)).toBe("C");
    expect(transposeChord("C", -1, false)).toBe("B");
    expect(transposeChord("G", 12, false)).toBe("G");
  });

  it("leaves a chord alone when nothing is asked of it", () => {
    expect(transposeChord("Bb", 0, false)).toBe("Bb");
  });

  it("leaves alone what is not a chord", () => {
    expect(transposeChord("N.C.", 3, false)).toBe("N.C.");
    expect(transposeChord("%", 3, false)).toBe("%");
  });
});

describe("transposeSong", () => {
  // The bug this file was rewritten for: a song in A minor has no accidentals
  // to go by, and went up three semitones as "Cm G# D# A#".
  it("spells a song in a flat key with flats", () => {
    expect(chordsOf(transposeSong(song(["Am", "F", "C", "G"]), 3))).toEqual(["Cm", "Ab", "Eb", "Bb"]);
  });

  it("spells a song in a sharp key with sharps", () => {
    expect(chordsOf(transposeSong(song(["G", "C", "D", "Em"]), 2))).toEqual(["A", "D", "E", "F#m"]);
  });

  it("goes down as well as up", () => {
    expect(chordsOf(transposeSong(song(["E", "A", "B", "C#m"]), -1))).toEqual(["Eb", "Ab", "Bb", "Cm"]);
  });

  it("writes F sharp for the major key and E flat minor for the minor one", () => {
    expect(chordsOf(transposeSong(song(["G", "C", "D", "Em"]), -1))).toEqual(["F#", "B", "C#", "D#m"]);
    expect(chordsOf(transposeSong(song(["Em", "C", "G", "D"]), -1))).toEqual(["Ebm", "B", "Gb", "Db"]);
  });

  it("comes back to where it started", () => {
    const original = song(["G", "C", "D", "Em"], ["Am", "D7", "G"]);
    expect(chordsOf(transposeSong(transposeSong(original, 5), -5))).toEqual(chordsOf(original));
    expect(chordsOf(transposeSong(original, 12))).toEqual(chordsOf(original));
  });

  it("changes only the chord names", () => {
    const original = song(["G", "D/F#"]);
    const moved = transposeSong(original, 2);
    expect(moved[0]).toEqual(original[0]); // the section header
    const before = original[1], after = moved[1];
    if (before.type !== "lyric" || after.type !== "lyric") throw new Error("expected a lyric line");
    expect(after.text).toBe(before.text);
    expect(after.chords.map((c) => c.position)).toEqual(before.chords.map((c) => c.position));
    expect(after.chords.map((c) => c.id)).toEqual(before.chords.map((c) => c.id));
    expect(after.chords.map((c) => c.chord)).toEqual(["A", "E/G#"]);
  });

  it("hands back the same song for no change, and for a song with no chords", () => {
    const original = song(["G", "C"]);
    expect(transposeSong(original, 0)).toBe(original);
    const wordsOnly = song([]);
    expect(transposeSong(wordsOnly, 4)).toBe(wordsOnly);
  });
});

describe("songKey", () => {
  it("names the key a song is in", () => {
    expect(songKey(song(["G", "C", "D", "Em"]))).toBe("G");
    expect(songKey(song(["E", "A", "B"]))).toBe("E");
    expect(songKey(song(["F", "Bb", "C"]))).toBe("F");
  });

  it("hears a minor key when the song is at home on the minor chord", () => {
    expect(songKey(song(["Am", "F", "C", "G"]))).toBe("Am");
    expect(songKey(song(["Dm", "Bb", "F", "C"]))).toBe("Dm");
  });

  it("follows the song's saved transposition", () => {
    expect(songKey(song(["G", "C", "D", "Em"]), 2)).toBe("A");
    expect(songKey(song(["Am", "F", "C", "G"]), 3)).toBe("Cm");
  });

  it("has no answer for a song without chords", () => {
    expect(songKey(song([]))).toBeNull();
  });
});
