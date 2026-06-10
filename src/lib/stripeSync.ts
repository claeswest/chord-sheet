import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Self-healing subscription sync.
//
// Webhooks are the primary update path, but a single missed delivery leaves
// the DB stale forever (e.g. status stuck on "trialing" after the trial→active
// transition already happened and the customer was charged). This helper
// reconciles with Stripe directly whenever the stored data looks expired, so
// the account/plan pages repair themselves instead of trusting webhooks alone.

interface SyncableUser {
  id: string;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  stripeSubscriptionStatus?: string | null;
}

export interface SyncedFields {
  plan: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCurrentPeriodEnd: Date | null;
}

/**
 * If the stored subscription period has passed, fetch the live subscription
 * from Stripe and update the DB. Returns the fresh fields when a sync
 * happened, or null when the stored data is still current (or sync failed —
 * never throws, the page renders with stored data as a fallback).
 */
export async function syncStaleSubscription(user: SyncableUser): Promise<SyncedFields | null> {
  if (!user.stripeSubscriptionId) return null;
  if (!user.stripeCurrentPeriodEnd || user.stripeCurrentPeriodEnd >= new Date()) return null;

  try {
    const sub = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
    const item = sub.items.data[0];
    const priceId = item?.price.id ?? null;
    const plan =
      priceId === process.env.STRIPE_PRICE_MONTHLY
        ? "monthly"
        : priceId === process.env.STRIPE_PRICE_YEARLY
        ? "yearly"
        : null;

    if (!plan || sub.status === "canceled" || sub.status === "incomplete_expired") {
      const cleared: SyncedFields = {
        plan: "free",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeSubscriptionStatus: null,
        stripeCurrentPeriodEnd: null,
      };
      await prisma.user.update({ where: { id: user.id }, data: cleared });
      return cleared;
    }

    const fresh: SyncedFields = {
      plan,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: new Date(item.current_period_end * 1000),
    };
    await prisma.user.update({ where: { id: user.id }, data: fresh });
    return fresh;
  } catch (err) {
    // Subscription no longer exists in Stripe → revert to free.
    if ((err as { code?: string })?.code === "resource_missing") {
      const cleared: SyncedFields = {
        plan: "free",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeSubscriptionStatus: null,
        stripeCurrentPeriodEnd: null,
      };
      await prisma.user.update({ where: { id: user.id }, data: cleared }).catch(() => {});
      return cleared;
    }
    // Network/Stripe hiccup — keep stored data, never block the page.
    console.error("[stripe-sync] reconcile failed:", (err as Error)?.message);
    return null;
  }
}
