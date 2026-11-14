// The example songs, ready to render: the text in exampleSources.ts turned
// into lines, with the look the AI gave each one.
//
// exampleStyles.json is what /api/ai/style returned for each song, untouched;
// the picture beside it in /public/examples came from /api/ai/background, in
// the background style named in the source. Nothing was drawn or picked by
// hand except that style and, where noted, the overlay. To give a song a new
// look, ask the same two routes again and save what comes back.

import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";
import { extractInlineChords } from "@/lib/parseChordSheet";
import { EXAMPLE_SOURCES, type ExampleSource } from "./exampleSources";

export { EXAMPLE_SLUGS } from "./exampleSources";
import styles from "./exampleStyles.json";

export interface ExampleSong extends Omit<ExampleSource, "text" | "bgStyle" | "overlayOpacity"> {
  href: string;
  /** Screenshot of the page at `href`, for the card. */
  img: string;
  lines: SongLine[];
  style: SongStyle;
}

function toLines(slug: string, text: string): SongLine[] {
  const lines: SongLine[] = text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "")
    .map((l, i) =>
      l.startsWith("# ")
        ? { id: `${slug}-${i}`, type: "section" as const, label: l.slice(2).trim() }
        : { id: `${slug}-${i}`, type: "lyric" as const, text: l, chords: [] },
    );
  return extractInlineChords(lines);
}

export const EXAMPLE_SONGS: ExampleSong[] = EXAMPLE_SOURCES.map(({ text, bgStyle: _bgStyle, overlayOpacity, ...song }) => ({
  ...song,
  href: `/examples/${song.slug}`,
  img: `/examples/${song.slug}.jpg`,
  lines: toLines(song.slug, text),
  style: {
    ...(styles as unknown as Record<string, SongStyle>)[song.slug],
    backgroundImage: `/examples/${song.slug}-bg.jpg`,
    backgroundSource: "ai",
    aiStyled: true,
    overlayOpacity: overlayOpacity ?? 0.5,
  },
}));

export function exampleBySlug(slug: string): ExampleSong | undefined {
  return EXAMPLE_SONGS.find((s) => s.slug === slug);
}
