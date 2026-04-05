import type { SongLine } from "@/types/song";
import type { SongStyle } from "./songStyle";

export type DbSong = {
  id: string;
  title: string;
  artist: string;
  lines: SongLine[];
  tags: string[];
  updatedAt: string;
  categoryIds?: string[];
  style?: SongStyle;
};

export async function fetchSongs(): Promise<DbSong[]> {
  const res = await fetch("/api/songs", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch songs");
  const rows = await res.json();
  return rows.map(rowToDbSong);
}

export async function upsertSong(song: Omit<DbSong, "updatedAt">): Promise<DbSong> {
  const res = await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error("Failed to save song");
  return rowToDbSong(await res.json());
}

export async function removeSong(id: string): Promise<void> {
  await fetch(`/api/songs/${id}`, { method: "DELETE" });
}

/** Saves the background image for a song via the dedicated endpoint (avoids large POST body). */
export async function saveBackgroundImage(songId: string, backgroundImage: string | undefined): Promise<void> {
  await fetch(`/api/songs/${songId}/background`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backgroundImage: backgroundImage ?? null }),
  });
}

/** Fetches the full style (including backgroundImage) for a single song by ID. */
export async function fetchSongStyle(id: string): Promise<SongStyle | undefined> {
  const res = await fetch(`/api/songs/${id}`, { cache: "no-store" });
  if (!res.ok) return undefined;
  const row = await res.json();
  return (row.content as any)?.style ?? undefined;
}

/** Duplicates a song — fetches full content (incl. backgroundImage) then saves as new. */
export async function duplicateSong(song: DbSong): Promise<DbSong> {
  // Fetch full content from DB to include backgroundImage
  const res = await fetch(`/api/songs/${song.id}`, { cache: "no-store" });
  const fullContent = res.ok ? ((await res.json()).content ?? {}) : {};
  const fullStyle = fullContent.style ?? song.style;

  return upsertSong({
    id: crypto.randomUUID(),
    title: `${song.title} (copy)`,
    artist: song.artist,
    lines: song.lines,
    tags: song.tags ?? [],
    style: fullStyle,
  });
}

function rowToDbSong(row: any): DbSong {
  const content = row.content ?? {};
  return {
    id: row.id,
    title: row.title ?? "Untitled Song",
    artist: row.artist ?? "",
    lines: content.lines ?? [],
    tags: content.tags ?? [],
    updatedAt: row.updatedAt,
    categoryIds: row.categoryIds ?? [],
    style: content.style ?? undefined,
  };
}
