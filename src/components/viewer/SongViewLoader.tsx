"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SongViewer from "@/components/editor/SongViewer";
import { decodeSong } from "@/lib/songUrl";
import Link from "next/link";

export default function SongViewLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encoded = searchParams.get("song");

  if (!encoded) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">
        No song found.{" "}
        <Link href="/songs" className="text-indigo-600 underline ml-1">
          Go to library
        </Link>
      </div>
    );
  }

  const song = decodeSong(encoded);

  if (!song) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">
        Invalid song link.{" "}
        <Link href="/songs" className="text-indigo-600 underline ml-1">
          Go to library
        </Link>
      </div>
    );
  }

  const editUrl = `/editor/new?song=${encoded}`;

  return (
    <div>
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">Sheet</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <Link href="/songs" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          ← My Songs
        </Link>
      </div>
      <SongViewer
        title={song.title}
        artist={song.artist}
        lines={song.lines}
        onEdit={() => router.push(editUrl)}
      />
    </div>
  );
}
