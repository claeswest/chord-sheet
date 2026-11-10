// Shared by the admin Songs page and its API routes. Client-safe: no Prisma.

/** How a song came to exist, from the song_created activity row. */
export const SONG_ORIGINS = [
  "ai-search",
  "pasted-text",
  "photo",
  "scratch",
  "template",
  "demo",
  "duplicate",
  "unknown",
] as const;
export type SongOrigin = (typeof SONG_ORIGINS)[number];

export const ORIGIN_LABELS: Record<SongOrigin, string> = {
  "ai-search": "AI search",
  "pasted-text": "Pasted text",
  photo: "Photo",
  scratch: "From scratch",
  template: "Template",
  demo: "Demo song",
  duplicate: "Duplicate",
  // Songs from before origin was logged, or whose creation row is gone.
  unknown: "Not recorded",
};

/** Background filter. "untracked" is a background whose source wasn't recorded. */
export const BG_FILTERS = ["any", "none", "ai", "upload", "untracked"] as const;
export type BgFilter = (typeof BG_FILTERS)[number];

export const SONG_SORTS = ["newest", "oldest", "updated", "longest"] as const;
export type SongSort = (typeof SONG_SORTS)[number];

/**
 * When the editor started recording aiStyled and backgroundSource on a song.
 * Anything styled before this carries neither flag.
 */
export const PROVENANCE_SINCE = "2026-11-10";

export function pick<T extends readonly string[]>(list: T, raw: string | null | undefined): T[number] | null {
  return (list as readonly string[]).includes(raw ?? "") ? (raw as T[number]) : null;
}

export interface AdminSongRow {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  origin: SongOrigin;
  hasBg: boolean;
  bgSource: "ai" | "upload" | null;
  aiStyled: boolean;
  lines: number;
  chars: number;
  chords: number;
  sections: number;
  font: string | null;
  bytes: number;
}

export interface AdminSongStats {
  total: number;
  new7: number;
  new30: number;
  authors: number;
  empty: number;
  withBg: number;
  bgAi: number;
  bgUpload: number;
  aiStyled: number;
  /** Songs saved since PROVENANCE_SINCE — the base the AI-style share can be read against. */
  trackedSince: number;
  avgLines: number;
  avgChars: number;
  medianChars: number;
  avgChords: number;
  avgSections: number;
  avgBytes: number;
  maxBytes: number;
  origins: { origin: SongOrigin; n: number }[];
  fonts: { font: string | null; n: number }[];
  weeks: { week: string; n: number }[];
}
