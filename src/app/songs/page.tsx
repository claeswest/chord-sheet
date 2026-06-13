import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planFromUser, getSongLimit } from "@/lib/plans";
import { syncStaleSubscription } from "@/lib/stripeSync";
import SongLibraryPage from "@/components/library/SongLibraryPage";

export default async function SongsPage() {
  const session = await auth();

  // Guests are capped at the same free-tier limit (they can't exceed Free).
  let songLimit: number | null = getSongLimit("free");

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        plan: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripeSubscriptionStatus: true,
      },
    });
    if (user) {
      // Self-heal stale subscription data (e.g. a missed Stripe webhook)
      const synced = await syncStaleSubscription(user);
      if (synced) Object.assign(user, synced);
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
