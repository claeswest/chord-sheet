"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SongViewer from "@/components/editor/SongViewer";
import LoadingNotes from "@/components/ui/LoadingNotes";
import { decodeSong } from "@/lib/songUrl";
import type { SongStyle } from "@/lib/songStyle";

export default function SongViewLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encoded = searchParams.get("song");
  const song = encoded ? decodeSong(encoded) : null;

  const [ready, setReady] = useState(false);
  const [songStyle, setSongStyle] = useState<SongStyle | undefined>(song?.style);

  // Fetch full style (incl. backgroundImage) from DB if we have an ID
  useEffect(() => {
    const id = song?.id;
    if (!id) { setReady(true); return; }
    // Seed from sessionStorage cache immediately so background shows without waiting for fetch
    const cached = sessionStorage.getItem(`bgImg:${id}`);
    if (cached) setSongStyle(prev => ({ ...(prev ?? {} as SongStyle), backgroundImage: cached }));
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
      .catch(() => {})
      .finally(() => setReady(true));
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
    <div className="h-screen flex flex-col overflow-hidden relative">
      <SongViewer
        title={song.title}
        artist={song.artist}
        lines={song.lines}
        songStyle={songStyle}
        songId={song.id}
        onEdit={() => router.push(editUrl)}
        loading={!ready}
      />
    </div>
  );
}
