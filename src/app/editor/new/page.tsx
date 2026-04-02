import { Suspense } from "react";
import SongEditorLoader from "@/components/editor/SongEditorLoader";

export default function NewSongPage() {
  return (
    <Suspense fallback={null}>
      <SongEditorLoader />
    </Suspense>
  );
}
