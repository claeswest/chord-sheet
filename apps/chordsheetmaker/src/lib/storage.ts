import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";

const STORAGE_KEY = "chordsheet_songs";
const INDEX_KEY = "chordsheet_index"; // ordered list of ids

export type StoredSong = {
  id: string;
  title: string;
  artist: string;
  lines: SongLine[];
  updatedAt: string; // ISO string
  tags?: string[];
  style?: SongStyle;     // the whole look; its picture too when the browser had room for it
  semitones?: number;    // current transpose
};

export function updateSongTags(id: string, tags: string[]): void {
  const raw = localStorage.getItem(`${STORAGE_KEY}_${id}`);
  if (!raw) return;
  try {
    const song: StoredSong = JSON.parse(raw);
    saveSong({ ...song, tags });
  } catch {
    // ignore corrupt entry
  }
}

function readIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export function listSongs(): StoredSong[] {
  const ids = readIndex();
  const songs: StoredSong[] = [];
  for (const id of ids) {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (raw) songs.push(JSON.parse(raw));
    } catch {
      // skip corrupt entries
    }
  }
  return songs;
}

export function saveSong(song: StoredSong): void {
  localStorage.setItem(`${STORAGE_KEY}_${song.id}`, JSON.stringify(song));
  const ids = readIndex().filter((id) => id !== song.id);
  writeIndex([song.id, ...ids]); // most recent first
}

export function getSong(id: string): StoredSong | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${id}`);
    return raw ? (JSON.parse(raw) as StoredSong) : null;
  } catch {
    return null;
  }
}

/**
 * Saves a song with its background picture if the browser has room for it,
 * and without it if not. Returns whether the picture was kept.
 *
 * Pictures used to be dropped from every guest save, on the grounds that they
 * might fill localStorage. They are compressed to roughly 150 KB before they
 * get here and a guest holds a handful of songs, so there is usually room —
 * and a look that vanished on reload was the feature not working for the
 * people who make most of the songs.
 */
export function saveSongWithPicture(song: StoredSong): boolean {
  try {
    saveSong(song);
    return true;
  } catch {
    // Quota. The words and chords matter more than the picture.
    try {
      saveSong({ ...song, style: song.style ? { ...song.style, backgroundImage: undefined } : song.style });
    } catch { /* nothing more to give up */ }
    return false;
  }
}

export function deleteSong(id: string): void {
  localStorage.removeItem(`${STORAGE_KEY}_${id}`);
  writeIndex(readIndex().filter((i) => i !== id));
}
