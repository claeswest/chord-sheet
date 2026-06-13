import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planFromUser, canUseFeature } from "@/lib/plans";

// Returns the current viewer's plan-gated entitlements. Guests and free users
// get the Pro features locked. Used client-side (e.g. SongViewer) to gate the
// PDF export and share actions without plumbing plan data through every page.
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ plan: "free", pdfExport: false, sharing: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeSubscriptionStatus: true,
    },
  });

  const plan = user ? planFromUser(user) : "free";
  return NextResponse.json({
    plan,
    pdfExport: canUseFeature(plan, "pdfExport"),
    sharing: canUseFeature(plan, "sharing"),
  });
}
