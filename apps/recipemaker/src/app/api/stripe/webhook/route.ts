import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { pendingCancellationAt, currentPeriodEnd } from "@clavos/core/billing";
import { logActivity } from "@/lib/activity";

// POST /api/stripe/webhook — the only thing that may change a user's plan.
//
// Mirrors ChordSheetMaker's webhook, including two corrections learned there:
//  1. A pending cancellation arrives in two shapes — an explicit `cancel_at`
//     (what the customer portal sets) or `cancel_at_period_end`. The status
//     stays trialing/active until the date arrives, so this is the ONLY signal
//     that someone has left, and it is recorded when it happens rather than
//     when the subscription finally lapses, which can be a year later.
//  2. On deletion `stripeCancelAt` is cleared. Leaving the old date behind
//     marks a churned account as permanently "about to cancel" anywhere that
//     tests the field for presence.
//
// No admin notifications: this app has no notify.ts or admin panel yet, so
// events go to the activity log only. Add notifyAdmin here when it does.

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    // Signature verification is what makes this endpoint safe to expose: the
    // raw body must be used, which is why it is read as text above.
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (!user) break;

      const priceId = sub.items.data[0]?.price.id;
      const plan =
        priceId === process.env.STRIPE_PRICE_MONTHLY
          ? "monthly"
          : priceId === process.env.STRIPE_PRICE_YEARLY
            ? "yearly"
            : null;
      if (!plan) break;

      const prevStatus = user.stripeSubscriptionStatus;
      const prevCancelAt = user.stripeCancelAt;

      const cancelAt = pendingCancellationAt(sub);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          stripeSubscriptionStatus: sub.status,
          stripeCancelAt: cancelAt,
          stripeCurrentPeriodEnd: currentPeriodEnd(sub),
        },
      });

      if (event.type === "customer.subscription.created") {
        await logActivity("sub_started", user.id, { plan, status: sub.status });
        break;
      }

      if (prevStatus !== "active" && sub.status === "active") {
        await logActivity("sub_changed", user.id, {
          plan, status: sub.status, from: prevStatus, event: "trial_converted",
        });
      }

      if (!prevCancelAt && cancelAt) {
        await logActivity("sub_changed", user.id, {
          plan, status: sub.status, event: "cancel_scheduled", cancelAt: cancelAt.toISOString(),
        });
      } else if (prevCancelAt && !cancelAt) {
        await logActivity("sub_changed", user.id, {
          plan, status: sub.status, event: "cancel_reverted",
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (!user) break;

      await logActivity("sub_ended", user.id, { plan: user.plan });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "free",
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          stripeSubscriptionStatus: null,
          stripeCancelAt: null,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
