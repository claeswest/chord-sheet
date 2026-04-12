"use client";

import Link from "next/link";
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
      <div className="bg-[#302b63] border-b border-white/10 px-6 py-3 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-sm font-bold tracking-tight text-white">
          Chord<span className="text-indigo-400">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <span className="text-sm text-white/40">Shared song</span>
      </div>
      <SongViewer
        title={title}
        artist={artist}
        lines={lines}
        songStyle={style}
      />
    </div>
  );
}
