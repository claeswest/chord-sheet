"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SongViewer from "@/components/editor/SongViewer";
import LoadingNotes from "@/components/ui/LoadingNotes";
import { decodeSong } from "@/lib/songUrl";
import { getSong } from "@/lib/storage";
import { queuePosition } from "@/lib/playQueue";
import type { SongStyle } from "@/lib/songStyle";
import Link from "next/link";

/**
 * Keyed on the song, so stepping to the next one in a setlist starts it
 * afresh — at the top, not playing, with its own picture — instead of
 * carrying the last song's state across.
 */
export default function SongViewLoader() {
  const encoded = useSearchParams().get("song");
  return <SongView key={encoded ?? ""} encoded={encoded} />;
}

function SongView({ encoded }: { encoded: string | null }) {
  const router = useRouter();
  const song = encoded ? decodeSong(encoded) : null;
  // The list the song was opened from, if the library left one (lib/playQueue.ts).
  const queue = useMemo(() => queuePosition(song?.id), [song?.id]);

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
        } else {
          // Not in an account — a guest's song. Its picture, if it has one, is
          // in this browser; the link that opened this page cannot carry it.
          const local = getSong(id)?.style?.backgroundImage;
          if (local) setSongStyle((prev) => ({ ...(prev ?? ({} as SongStyle)), backgroundImage: local }));
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
        <Link href="/songs" className="text-chord underline ml-1">
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
        queue={queue}
        onQueueGo={(url) => router.push(url)}
      />
    </div>
  );
}
