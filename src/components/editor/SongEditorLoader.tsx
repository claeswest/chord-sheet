"use client";

import { useSearchParams } from "next/navigation";
import SongEditor from "./SongEditor";
import { decodeSong, type SharedSong } from "@/lib/songUrl";

interface Props {
  isLoggedIn: boolean;
}

export default function SongEditorLoader({ isLoggedIn }: Props) {
  const searchParams = useSearchParams();
  const encoded = searchParams.get("song");
  const initialSong: SharedSong | null = encoded ? decodeSong(encoded) : null;
  return <SongEditor initialSong={initialSong} isLoggedIn={isLoggedIn} />;
}
