import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { applySubscription } from "@/lib/subscription";

// POST /api/stripe/webhook — Stripe telling this app that a subscription
// started, changed or ended.
//
// This is how Plus is taken away again when someone stops paying, and for a
// buyer who closed the tab on the way back from paying it is also how Plus is
// turned on.
//
// It is open to the internet and trusts nothing it is sent. The signature
// proves the message is from Stripe; after that only two things are read from
// it, which customer and which subscription. What the subscription looks like
// is then asked of Stripe (lib/subscription.ts), because events can arrive in
// the wrong order and the newest state is the one that counts.
//
// A customer this database does not know is not ours to act on — someone made
// by hand in Stripe, say, or one whose account here has been deleted — and is
// answered with a plain "received".
//
// A failure on our side is answered with an error on purpose: Stripe then
// sends the event again, for up to three days.

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The signature is over the exact bytes sent, so the body is read as text
  // and never parsed and re-written.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customer },
        select: { id: true },
      });
      if (user) await applySubscription(user.id, sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
