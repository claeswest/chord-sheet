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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          stripeSubscriptionStatus: sub.status, // trialing | active | past_due | canceled
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
      } else if (prevStatus !== "active" && sub.status === "active") {
        await logActivity("sub_changed", user.id, { plan, status: sub.status, from: prevStatus });
        await notifyAdmin(`💳 Trial converted to paid — ${plan}`, [
          `${who} converted to a paying ${plan} subscription.`,
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
