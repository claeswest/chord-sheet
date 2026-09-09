import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SongEditorLoader from "@/components/editor/SongEditorLoader";
import NewSongAtLimit from "@/components/editor/NewSongAtLimit";
import LoadingNotes from "@/components/ui/LoadingNotes";
import { getSongLimit, planFromUser, type Plan } from "@/lib/plans";

export default async function NewSongPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  // One query for both questions rather than two: whether they have any songs
  // at all (which the editor uses), and how many (which decides whether there
  // is any point opening it).
  const songCount = isLoggedIn
    ? await prisma.song.count({ where: { userId: session!.user!.id } })
    : 0; // guests: checked client-side in SongEditor via localStorage

  // The limit is checked here, before the editor, and not only by the server
  // on save. Saving is where it used to be caught — after someone had written
  // a whole chart, at which point the app redirected them out of the editor
  // and the work was gone. The landing page's hero now sends signed-in people
  // straight here, so the dead end became much easier to walk into.
  if (isLoggedIn) {
    const user = await prisma.user.findUnique({ where: { id: session!.user!.id } });
    const limit = getSongLimit(planFromUser(user ?? { plan: "free" }) as Plan);
    if (limit !== null && songCount >= limit) {
      return <NewSongAtLimit limit={limit} />;
    }
  }

  return (
    <Suspense fallback={<LoadingNotes label="Loading editor…" />}>
      <SongEditorLoader isLoggedIn={isLoggedIn} hasSongs={songCount > 0} />
    </Suspense>
  );
}
