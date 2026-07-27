import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (!userId || !plan) break;

      if (session.mode === "payment") {
        // Lifetime — one-time purchase
        await prisma.user.update({
          where: { id: userId },
          data: { plan, stripePriceId: plan },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (customer.deleted) break;

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

      // A pending cancellation shows up in two shapes depending on how it was
      // made: cancel_at_period_end, or an explicit cancel_at timestamp (which
      // is what the customer portal sets). Either way the status stays
      // trialing/active until the date arrives, so this is the only signal
      // that someone has left.
      const cancelAt = sub.cancel_at
        ? new Date(sub.cancel_at * 1000)
        : sub.cancel_at_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          stripeSubscriptionStatus: sub.status, // trialing | active | past_due | canceled
          stripeCancelAt: cancelAt,
          stripeCurrentPeriodEnd: new Date(
            sub.items.data[0].current_period_end * 1000
          ),
        },
      });

      // Notify: a brand-new subscription, or a trial converting to paying.
      const who = `${user.name || "A user"} (${user.email ?? "?"})`;
      if (event.type === "customer.subscription.created") {
        await logActivity("sub_started", user.id, { plan, status: sub.status });
        await notifyAdmin(
          `💰 New subscriber — ${plan}${sub.status === "trialing" ? " (trial)" : ""}`,
          [`${who} started a ${plan} plan. Status: ${sub.status}.`]
        );
        break;
      }

      if (prevStatus !== "active" && sub.status === "active") {
        await logActivity("sub_changed", user.id, { plan, status: sub.status, from: prevStatus });
        await notifyAdmin(`💳 Trial converted to paid — ${plan}`, [
          `${who} converted to a paying ${plan} subscription.`,
        ]);
      }

      // Cancellation scheduled / reversed — logged the moment it happens, not
      // when the subscription finally lapses (which can be a year away).
      const ends = cancelAt?.toISOString().slice(0, 10);
      if (!prevCancelAt && cancelAt) {
        await logActivity("sub_changed", user.id, {
          plan, status: sub.status, event: "cancel_scheduled", cancelAt: cancelAt.toISOString(),
        });
        await notifyAdmin(`⚠️ Cancellation scheduled — ${plan}`, [
          `${who} cancelled their ${plan} plan. Access runs until ${ends}.`,
          `Status is still "${sub.status}" until then — a good window to reach out and ask why.`,
        ]);
      } else if (prevCancelAt && !cancelAt) {
        await logActivity("sub_changed", user.id, {
          plan, status: sub.status, event: "cancel_reverted",
        });
        await notifyAdmin(`🎉 Cancellation reversed — ${plan}`, [
          `${who} resumed their ${plan} subscription.`,
        ]);
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
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
