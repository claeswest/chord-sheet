import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planFromUser } from "@/lib/plans";
import { Suspense } from "react";
import PricingContent from "./PricingContent";

export default async function PricingPage() {
  const session = await auth();
  let currentPlan: string | null = null;
  let userName: string | null = null;
  let userImage: string | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true, name: true, image: true },
    });
    if (user) {
      currentPlan = planFromUser(user);
      userName = user.name;
      userImage = user.image;
    }
  }

  return (
    <Suspense>
      <PricingContent currentPlan={currentPlan} userName={userName} userImage={userImage} />
    </Suspense>
  );
}
