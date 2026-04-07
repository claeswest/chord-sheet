"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SongViewer from "@/components/editor/SongViewer";
import { decodeSong } from "@/lib/songUrl";
import type { SongStyle } from "@/lib/songStyle";
import Link from "next/link";

export default function SongViewLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encoded = searchParams.get("song");
  const song = encoded ? decodeSong(encoded) : null;

  const [songStyle, setSongStyle] = useState<SongStyle | undefined>(() => {
    // Seed backgroundImage from sessionStorage cache so it's visible immediately
    const base = song?.style;
    const id = song?.id;
    if (id && typeof sessionStorage !== "undefined") {
      const cached = sessionStorage.getItem(`bgImg:${id}`);
      if (cached) return { ...(base ?? {} as SongStyle), backgroundImage: cached };
    }
    return base;
  });

  // Fetch full style (incl. backgroundImage) from DB if we have an ID
  useEffect(() => {
    const id = song?.id;
    if (!id) return;
    fetch(`/api/songs/${id}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const fullStyle: SongStyle | undefined = (data?.content as any)?.style;
        if (fullStyle) {
          if (fullStyle.backgroundImage) {
            sessionStorage.setItem(`bgImg:${id}`, fullStyle.backgroundImage);
          }
          setSongStyle(fullStyle);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!encoded || !song) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">
        No song found.{" "}
        <Link href="/songs" className="text-indigo-600 underline ml-1">
          Go to library
        </Link>
      </div>
    );
  }

  const editUrl = `/editor/new?song=${encoded}`;

  return (
    <div>
      <div className="bg-[#302b63] border-b border-white/10 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-white">
          Chord<span className="text-indigo-400">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <Link href="/songs" className="text-sm text-white/60 hover:text-white transition-colors">
          ← Songs
        </Link>
      </div>
      <SongViewer
        title={song.title}
        artist={song.artist}
        lines={song.lines}
        songStyle={songStyle}
        onEdit={() => router.push(editUrl)}
      />
    </div>
  );
}
