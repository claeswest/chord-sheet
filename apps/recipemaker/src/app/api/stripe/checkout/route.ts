import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLANS, type Plan } from "@/lib/plans";

// POST /api/stripe/checkout — start a subscription.
//
// Mirrors ChordSheetMaker's route. The plan comes from the client, so it is
// looked up in PLANS rather than trusted: a caller must not be able to name a
// Stripe price id of their own.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as Plan;
  const config = PLANS[plan];
  if (!config?.stripePriceId) {
    return NextResponse.json({ error: "That plan isn't available." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stripe = getStripe();

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3001";

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: config.stripePriceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    // VAT on digital services follows the customer's country, so Stripe has to
    // work out the rate. Enabling Stripe Tax in the dashboard alone does
    // nothing — the session must ask for it.
    automatic_tax: { enabled: true },
    // ...and it can only work out a rate once it knows where the customer is.
    // Without this, Checkout won't write the address back to an existing
    // customer and the tax calculation has nothing to go on.
    customer_update: { address: "auto" },
    // The prices are tax-inclusive (see plans.ts), so $5 is what the customer
    // pays; the VAT is broken out of it rather than added on top.
    billing_address_collection: "auto",
    success_url: `${baseUrl}/pricing?success=true`,
    cancel_url: `${baseUrl}/pricing`,
    // The webhook reads these — without them a completed payment cannot be
    // matched back to an account.
    metadata: { userId: session.user.id, plan },
  });

  return NextResponse.json({ url: checkout.url });
}
