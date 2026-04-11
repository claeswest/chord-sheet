"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SongEditor from "./SongEditor";
import LoadingNotes from "@/components/ui/LoadingNotes";
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

  if (!ready) return <LoadingNotes label="Loading editor…" />;

  const encoded = searchParams.get("song");
  const initialSong: SharedSong | null = encoded ? decodeSong(encoded) : null;
  return <SongEditor initialSong={initialSong} isLoggedIn={isLoggedIn} hasSongs={hasSongs} />;
}
