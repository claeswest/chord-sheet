import type { SongLine } from "@/types/song";

const STORAGE_KEY = "chordsheet_songs";
const INDEX_KEY = "chordsheet_index"; // ordered list of ids

export type StoredSong = {
  id: string;
  title: string;
  artist: string;
  lines: SongLine[];
  updatedAt: string; // ISO string
  tags?: string[];
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

export function deleteSong(id: string): void {
  localStorage.removeItem(`${STORAGE_KEY}_${id}`);
  writeIndex(readIndex().filter((i) => i !== id));
}
