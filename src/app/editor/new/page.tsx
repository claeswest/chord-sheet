import { Suspense } from "react";
import { auth } from "@/lib/auth";
import SongEditorLoader from "@/components/editor/SongEditorLoader";
import LoadingNotes from "@/components/ui/LoadingNotes";

export default async function NewSongPage() {
  const session = await auth();
  return (
    <Suspense fallback={<LoadingNotes label="Loading editor…" />}>
      <SongEditorLoader isLoggedIn={!!session?.user?.id} />
    </Suspense>
  );
}
