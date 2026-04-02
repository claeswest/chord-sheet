// Core data types for chord sheet content

export type ChordToken = {
  id: string;
  chord: string;        // e.g. "Am", "G7", "D/F#"
  position: number;     // character offset within the lyric line
};

export type LyricLine = {
  id: string;
  type: "lyric";
  text: string;
  chords: ChordToken[];
};

export type SectionHeader = {
  id: string;
  type: "section";
  label: string;        // e.g. "Verse 1", "Chorus", "Bridge"
};

export type SongLine = LyricLine | SectionHeader;

export type SongContent = {
  lines: SongLine[];
};

export type SongMeta = {
  id: string;
  title: string;
  artist?: string | null;
  key?: string | null;
  capo?: number | null;
  tempo?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Song = SongMeta & {
  content: SongContent;
};
