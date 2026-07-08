"use client";

import dynamic from "next/dynamic";
import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";

// SongViewer uses canvas measurement (document.createElement) — must be client-only
const SongViewer = dynamic(() => import("@/components/editor/SongViewer"), { ssr: false });

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  style?: SongStyle;
  token?: string;
}

export default function ShareViewer({ title, artist, lines, style, token }: Props) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SongViewer
        title={title}
        artist={artist}
        lines={lines}
        songStyle={style}
        // Share token doubles as the per-song id so viewer preferences
        // (scroll speed, hide chords) persist for this link
        songId={token}
        isShared
      />
    </div>
  );
}
