import type { SongLine } from "@/types/song";

export type SharedSong = {
  id?: string; // present when opening from own library; absent for external shares
  title: string;
  artist: string;
  lines: SongLine[];
};

export function encodeSong(song: SharedSong): string {
  const json = JSON.stringify(song);
  // btoa doesn't handle unicode — use this safe wrapper
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

export function decodeSong(encoded: string): SharedSong | null {
  try {
    const json = decodeURIComponent(
      atob(encoded).split("").map((c) =>
        "%" + c.charCodeAt(0).toString(16).padStart(2, "0")
      ).join("")
    );
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SharedSong;
  } catch {
    return null;
  }
}
