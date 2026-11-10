"use client";

// Shared by the Users and Songs pages.

import { useEffect, useState } from "react";
import SongViewer from "@/components/editor/SongViewer";
import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";

interface FullSong {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  capo: number | null;
  tempo: number | null;
  content: { lines: SongLine[]; style?: SongStyle | null } | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; email: string | null };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Full-screen preview of a user's chord sheet, fetched from /api/admin/songs/[id]
 * and rendered with the real SongViewer so it looks exactly as the user styled it
 * (background image, fonts, chord preset, colors). Read-only — no edit button.
 */
export default function SongPreviewModal({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const [song, setSong] = useState<FullSong | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/songs/${songId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load song");
        return r.json();
      })
      .then((d) => !cancelled && setSong(d.song))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [songId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = song?.content?.lines ?? [];
  const style = song?.content?.style ?? undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      {/* Floating close button + owner label, above SongViewer's own controls */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-lg leading-none shadow-lg"
        title="Close (Esc)"
      >
        ×
      </button>
      {song && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] px-3 py-1 rounded-full bg-black/60 text-white/80 text-xs backdrop-blur-sm shadow-lg max-w-[60vw] truncate">
          {song.user.name ?? song.user.email} · {formatDate(song.createdAt)}
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
      )}
      {!song && !error && (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
      )}
      {song && lines.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-sm">
          This song has no content.
        </div>
      )}
      {song && lines.length > 0 && (
        <SongViewer
          title={song.title}
          artist={song.artist ?? ""}
          lines={lines}
          songStyle={style}
          songId={song.id}
          isShared
        />
      )}
    </div>
  );
}
