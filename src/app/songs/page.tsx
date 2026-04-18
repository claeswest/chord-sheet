import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planFromUser, getSongLimit } from "@/lib/plans";
import SongLibraryPage from "@/components/library/SongLibraryPage";

export default async function SongsPage() {
  const session = await auth();

  let songLimit: number | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripeSubscriptionStatus: true,
      },
    });
    if (user) {
      songLimit = getSongLimit(planFromUser(user));
    }
  }

  return (
    <SongLibraryPage
      isLoggedIn={!!session?.user?.id}
      userName={session?.user?.name ?? null}
      userImage={session?.user?.image ?? null}
      songLimit={songLimit}
    />
  );
}
