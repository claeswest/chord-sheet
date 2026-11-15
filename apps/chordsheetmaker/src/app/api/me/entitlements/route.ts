import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureLimit, planFromUser } from "@/lib/plans";
import { allowanceFor } from "@/lib/allowance";

// What the current viewer may do with PDF export and share links — for the
// song named in ?song=, since the free plan's allowance is per song. Used
// client-side (SongViewer) so plan data does not have to be plumbed through
// every page. The share route checks again on the server; a PDF is made in
// the browser, so for that this answer is the gate.
export async function GET(req: NextRequest) {
  const session = await auth();
  const pdfLimit = featureLimit("free", "pdfExport");
  const shareLimit = featureLimit("free", "sharing");

  // No account: nothing yet, and what a free one would give.
  if (!session?.user?.id) {
    return NextResponse.json({
      plan: "free", signedIn: false,
      pdfExport: false, sharing: false,
      pdfLeft: 0, sharesLeft: 0, pdfLimit, shareLimit,
      branded: true,
    });
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
  const songKey = req.nextUrl.searchParams.get("song")?.slice(0, 200) || null;
  const [pdf, share] = await Promise.all([
    allowanceFor(session.user.id, plan, "pdfExport", songKey),
    allowanceFor(session.user.id, plan, "sharing", songKey),
  ]);

  return NextResponse.json({
    plan,
    signedIn: true,
    pdfExport: pdf.allowed,
    sharing: share.allowed,
    pdfLeft: pdf.left,
    sharesLeft: share.left,
    pdfLimit: pdf.limit,
    shareLimit: share.limit,
    // A free export carries a line saying where it was made.
    branded: plan === "free",
  });
}
