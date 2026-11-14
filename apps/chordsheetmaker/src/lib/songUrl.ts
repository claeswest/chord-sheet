import type { SongLine } from "@/types/song";
import type { SongStyle } from "./songStyle";

export type SharedSong = {
  id?: string; // present when opening from own library; absent for external shares
  title: string;
  artist: string;
  lines: SongLine[];
  style?: SongStyle;
  semitones?: number;
};

/** A picture carried inside the style itself, rather than pointed to. */
export function isEmbeddedImage(src: string | undefined): boolean {
  return !!src && src.startsWith("data:");
}

export function encodeSong(song: SharedSong): string {
  // Strip an embedded backgroundImage — it's a large base64 blob that would
  // break URLs. A bundled picture (a short site path, as on the demo song) stays.
  const { style, ...rest } = song;
  const safeStyle = style
    ? { ...style, backgroundImage: isEmbeddedImage(style.backgroundImage) ? undefined : style.backgroundImage }
    : style;
  const json = JSON.stringify({ ...rest, style: safeStyle });
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
