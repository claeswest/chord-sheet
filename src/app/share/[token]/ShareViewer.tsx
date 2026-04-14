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
}

export default function ShareViewer({ title, artist, lines, style }: Props) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SongViewer
        title={title}
        artist={artist}
        lines={lines}
        songStyle={style}
      />
    </div>
  );
}
