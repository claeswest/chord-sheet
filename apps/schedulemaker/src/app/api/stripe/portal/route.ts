import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// POST /api/stripe/portal — "Hantera abonnemang".
//
// Answers with an address at Stripe where the subscription can be ended, the
// card changed and the receipts fetched. Ending it has to be something people
// do themselves, at once: a subscription that takes an email to stop is one
// that gets disputed with the bank instead.
//
// No plan is asked for. Someone whose card failed is not on Plus any more and
// is exactly who needs this page.

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "Du har inget abonnemang." }, { status: 400 });
  }

  const base = process.env.AUTH_URL ?? req.nextUrl.origin;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/plus`,
      locale: "sv",
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error(`[stripe] portal failed: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json(
      { error: "Det gick inte att öppna sidan. Försök igen om en stund." },
      { status: 502 },
    );
  }
}
