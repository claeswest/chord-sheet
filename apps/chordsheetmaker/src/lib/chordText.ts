import type { SongLine } from "@/types/song";

/**
 * A song as plain text, chords in square brackets where they fall:
 *
 *   [Verse 1]
 *   [Am]Hello [G]world
 *
 * The same format parseChordSheet reads, so text that came out of here can go
 * back in. It is what the MCP server hands an AI client, which reads and
 * writes this far more reliably than the structured lines.
 */
export function linesToChordText(lines: SongLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.type === "section") {
      // A blank line before each section but the first, as people write them.
      if (out.length > 0) out.push("");
      out.push(`[${line.label}]`);
      continue;
    }
    const chords = [...line.chords].sort((a, b) => a.position - b.position);
    if (!line.text.trim()) {
      // Chords with no words under them: an intro, a break.
      if (chords.length > 0) out.push(chords.map((c) => `[${c.chord}]`).join(" "));
      continue;
    }
    let text = "";
    let at = 0;
    for (const c of chords) {
      const cut = Math.min(Math.max(Math.round(c.position), at), line.text.length);
      text += line.text.slice(at, cut) + `[${c.chord}]`;
      at = cut;
    }
    out.push(text + line.text.slice(at));
  }
  return out.join("\n");
}
