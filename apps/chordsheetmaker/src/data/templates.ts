import type { SongLine } from "@/types/song";

const g = () => Math.random().toString(36).slice(2, 10);
const sec = (label: string): SongLine => ({ id: g(), type: "section", label });
const blank = (): SongLine => ({ id: g(), type: "lyric", text: "", chords: [] });
const blanks = (n: number): SongLine[] => Array.from({ length: n }, blank);

export interface SongTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  build: () => SongLine[];
}

export const TEMPLATES: SongTemplate[] = [
  {
    id: "standard",
    name: "Standard Song",
    description: "Verse · Chorus · Verse · Chorus · Bridge · Chorus",
    emoji: "🎵",
    build: () => [
      sec("Verse 1"),  ...blanks(4),
      sec("Chorus"),   ...blanks(4),
      sec("Verse 2"),  ...blanks(4),
      sec("Chorus"),   ...blanks(4),
      sec("Bridge"),   ...blanks(2),
      sec("Chorus"),   ...blanks(4),
    ],
  },
  {
    id: "verse-chorus",
    name: "Verse / Chorus",
    description: "Simple two-section structure",
    emoji: "🎶",
    build: () => [
      sec("Verse"),  ...blanks(4),
      sec("Chorus"), ...blanks(4),
    ],
  },
  {
    id: "blues",
    name: "12-Bar Blues",
    description: "Intro · Verses · Solo · Outro",
    emoji: "🎸",
    build: () => [
      sec("Intro"),   ...blanks(2),
      sec("Verse 1"), ...blanks(3),
      sec("Verse 2"), ...blanks(3),
      sec("Solo"),    ...blanks(2),
      sec("Outro"),   ...blanks(2),
    ],
  },
  {
    id: "aaba",
    name: "AABA (Jazz)",
    description: "Classic jazz form: A · A · B · A",
    emoji: "🎹",
    build: () => [
      sec("A"),          ...blanks(4),
      sec("A"),          ...blanks(4),
      sec("B (Bridge)"), ...blanks(4),
      sec("A"),          ...blanks(4),
    ],
  },
];
