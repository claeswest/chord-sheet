"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SongEditor from "./SongEditor";
import WorkingNotes from "@/components/ui/WorkingNotes";
import { decodeSong, type SharedSong } from "@/lib/songUrl";

interface Props {
  isLoggedIn: boolean;
  hasSongs?: boolean;
}

export default function SongEditorLoader({ isLoggedIn, hasSongs = false }: Props) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <WorkingNotes title="Loading editor…" className="h-screen" />;

  const encoded = searchParams.get("song");
  const initialSong: SharedSong | null = encoded ? decodeSong(encoded) : null;
  const start = searchParams.get("start") as "search" | "import" | "write" | "demo" | null;
  return <SongEditor initialSong={initialSong} isLoggedIn={isLoggedIn} hasSongs={hasSongs} initialMode={start} />;
}
