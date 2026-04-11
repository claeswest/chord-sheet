import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SongEditorLoader from "@/components/editor/SongEditorLoader";
import LoadingNotes from "@/components/ui/LoadingNotes";

export default async function NewSongPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  const hasSongs = isLoggedIn
    ? (await prisma.song.count({ where: { userId: session!.user!.id } })) > 0
    : false; // guests: checked client-side in SongEditor via localStorage

  return (
    <Suspense fallback={<LoadingNotes label="Loading editor…" />}>
      <SongEditorLoader isLoggedIn={isLoggedIn} hasSongs={hasSongs} />
    </Suspense>
  );
}
