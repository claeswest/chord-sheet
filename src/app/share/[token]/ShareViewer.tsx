"use client";

import Link from "next/link";
import SongViewer from "@/components/editor/SongViewer";
import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  style?: SongStyle;
}

export default function ShareViewer({ title, artist, lines, style }: Props) {
  return (
    <div>
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <span className="text-sm text-zinc-400">Shared song</span>
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
