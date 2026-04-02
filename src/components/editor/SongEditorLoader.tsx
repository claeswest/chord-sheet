"use client";

import { useSearchParams } from "next/navigation";
import SongEditor from "./SongEditor";
import { decodeSong, type SharedSong } from "@/lib/songUrl";

export default function SongEditorLoader() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get("song");
  const initialSong: SharedSong | null = encoded ? decodeSong(encoded) : null;
  return <SongEditor initialSong={initialSong} />;
}
