import { describe, it, expect } from "vitest";
import { linesToChordText } from "./chordText";
import { parseChordSheet } from "./parseChordSheet";

describe("linesToChordText", () => {
  it("writes chords in brackets where they fall, and sections on their own line", () => {
    const text = linesToChordText([
      { id: "s", type: "section", label: "Verse 1" },
      { id: "a", type: "lyric", text: "Hello world", chords: [
        { id: "1", chord: "Am", position: 0 },
        { id: "2", chord: "G", position: 6 },
      ] },
      { id: "c", type: "section", label: "Chorus" },
      { id: "b", type: "lyric", text: "No chords here", chords: [] },
    ]);
    expect(text).toBe("[Verse 1]\n[Am]Hello [G]world\n\n[Chorus]\nNo chords here");
  });

  it("keeps a line of chords with no words", () => {
    const text = linesToChordText([
      { id: "a", type: "lyric", text: "", chords: [
        { id: "1", chord: "F", position: 0 },
        { id: "2", chord: "C", position: 4 },
      ] },
    ]);
    expect(text).toBe("[F] [C]");
  });

  it("puts a chord placed past the end of the words at the end", () => {
    const text = linesToChordText([
      { id: "a", type: "lyric", text: "Stay", chords: [{ id: "1", chord: "D/F#", position: 40 }] },
    ]);
    expect(text).toBe("Stay[D/F#]");
  });

  it("gives text the parser reads back as the same song", () => {
    const written = "[Verse 1]\n[Am]Hello [G]darkness, my [C]old friend\n[Em]Come to [Am]talk\n\n[Chorus]\n[C]The [G]sound";
    const again = linesToChordText(parseChordSheet(written));
    expect(again).toBe(written);
  });
});
