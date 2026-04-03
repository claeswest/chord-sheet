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
