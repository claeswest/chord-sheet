import { Suspense } from "react";
import { auth } from "@/lib/auth";
import SongEditorLoader from "@/components/editor/SongEditorLoader";

export default async function NewSongPage() {
  const session = await auth();
  return (
    <Suspense fallback={null}>
      <SongEditorLoader isLoggedIn={!!session?.user?.id} />
    </Suspense>
  );
}
