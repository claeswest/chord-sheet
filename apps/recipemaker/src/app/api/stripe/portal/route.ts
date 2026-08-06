import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// POST /api/stripe/portal — manage or cancel an existing subscription.
//
// Cancelling has to be self-service. Making people email to cancel is the
// thing that turns a lapsed subscription into a chargeback.

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription to manage." }, { status: 400 });
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3001";
  const portal = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/pricing`,
  });

  return NextResponse.json({ url: portal.url });
}
