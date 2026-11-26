// What a Stripe subscription does to an account.
//
// One place, on purpose. Three things can bring news of a subscription — the
// webhook, the buyer landing back on the Plus page, and the check made when a
// paid period has run out unnoticed — and all three hand the subscription to
// `applySubscription` and let it decide. Written three times, the rule for
// "does this still count as paying" would sooner or later be three rules.
//
// Stripe is always asked what the subscription looks like NOW. Its events can
// arrive out of order, and an old "not paid yet" written over a newer "active"
// would take Plus from someone who had just bought it.

import type Stripe from "stripe";
import { currentPeriodEnd, pendingCancellationAt } from "@clavos/core/billing";
import { prisma } from "./prisma";
import { getStripe } from "./stripe";
import { logActivity } from "./activity";
import { plusPriceId } from "./plans";

/**
 * Paying, or as good as. `past_due` is in the list: a card that failed is
 * tried again by Stripe over some weeks, and a teacher whose card expired in
 * the middle of term should not lose the class's link while that is sorted
 * out. If the tries run out, Stripe ends the subscription and Plus with it.
 */
const ENTITLING = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

/** Over for good. Nothing will revive it; a new purchase is a new subscription. */
const ENDED = new Set<Stripe.Subscription.Status>(["canceled", "incomplete_expired"]);

const CLEARED = {
  plan: "free",
  stripeSubscriptionId: null,
  stripePriceId: null,
  stripeSubscriptionStatus: null,
  stripeCurrentPeriodEnd: null,
  stripeCancelAt: null,
} as const;

/**
 * Bring one account in step with one subscription, as Stripe has it now.
 *
 * - Paying, for Plus: the account is on Plus and holds this subscription.
 * - Not paying, and it is the subscription the account holds: Plus goes. An
 *   ended one is forgotten; one that could still be paid (`unpaid`, `paused`)
 *   is kept, so the Plus page can say what is wrong.
 * - Anything else changes nothing: a first payment still in progress
 *   (`incomplete`), a subscription to some other price, or old news about a
 *   subscription the account has since replaced.
 *
 * Returns the plan column as it now stands.
 */
export async function applySubscription(userId: string, subscriptionId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
      stripeCancelAt: true,
    },
  });
  if (!user) return null;

  let sub: Stripe.Subscription;
  try {
    sub = await getStripe().subscriptions.retrieve(subscriptionId);
  } catch (e) {
    // Stripe has no such subscription. If it is the one this account holds,
    // there is nothing left to be on Plus by.
    if ((e as { code?: string })?.code !== "resource_missing") throw e;
    if (user.stripeSubscriptionId !== subscriptionId) return user.plan;
    await prisma.user.update({ where: { id: userId }, data: CLEARED });
    await logActivity("sub_ended", userId, { reason: "missing" });
    return "free";
  }

  // Someone else's subscription has no business changing this account. The id
  // came from Stripe or from the account's own row, so this should never be
  // true — which is the reason to check it rather than to assume it.
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (!user.stripeCustomerId || customer !== user.stripeCustomerId) return user.plan;

  const held = user.stripeSubscriptionId === sub.id;
  const priceId = sub.items.data[0]?.price.id ?? null;

  if (ENTITLING.has(sub.status)) {
    if (!priceId || priceId !== plusPriceId()) return user.plan;
    const cancelAt = pendingCancellationAt(sub);
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: "plus",
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        stripeSubscriptionStatus: sub.status,
        stripeCurrentPeriodEnd: currentPeriodEnd(sub),
        stripeCancelAt: cancelAt,
      },
    });

    // The log gets what changed, once: the webhook, the return from checkout
    // and Stripe's own repeats all pass through here with the same news.
    if (!held || user.plan !== "plus") {
      await logActivity("sub_started", userId, { status: sub.status });
    } else if (!user.stripeCancelAt && cancelAt) {
      // Logged when the leaving is decided, not when it happens — which can be
      // a year later. The status stays "active" all that time.
      await logActivity("sub_changed", userId, { event: "cancel_scheduled", status: sub.status });
    } else if (user.stripeCancelAt && !cancelAt) {
      await logActivity("sub_changed", userId, { event: "cancel_reverted", status: sub.status });
    } else if (user.stripeSubscriptionStatus !== sub.status) {
      await logActivity("sub_changed", userId, {
        event: "status",
        from: user.stripeSubscriptionStatus,
        status: sub.status,
      });
    }
    return "plus";
  }

  if (!held) return user.plan;

  if (ENDED.has(sub.status)) {
    await prisma.user.update({ where: { id: userId }, data: CLEARED });
    await logActivity("sub_ended", userId, { status: sub.status });
    return "free";
  }

  if (sub.status === "incomplete") return user.plan;

  // `unpaid` or `paused`: not paying, not gone.
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "free",
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: currentPeriodEnd(sub),
      stripeCancelAt: pendingCancellationAt(sub),
    },
  });
  if (user.stripeSubscriptionStatus !== sub.status) {
    await logActivity("sub_changed", userId, {
      event: "status",
      from: user.stripeSubscriptionStatus,
      status: sub.status,
    });
  }
  return "free";
}

/**
 * The buyer is back from Stripe with the id of the checkout they finished.
 *
 * Turns Plus on now rather than when the webhook gets here. The id is in an
 * address, so anyone can put anything there: it has to be a session that this
 * account started, and the subscription in it is then judged like any other.
 *
 * True if the account is on Plus afterwards. Never throws — the webhook will
 * do the same work a moment later, and the page says so.
 */
export async function confirmCheckout(userId: string, sessionId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]{8,250}$/.test(sessionId)) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== userId) return false;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return false;
    return (await applySubscription(userId, subscriptionId)) === "plus";
  } catch (e) {
    console.error(`[stripe] could not confirm a checkout: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** A day past the period's end before anyone asks: Stripe's own news is usually seconds behind, not days. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
/** And not more often than this per subscription, while the answer stays the same. */
const RECHECK_MS = 5 * 60 * 1000;
const lastCheck = new Map<string, number>();

/**
 * Take Plus back from an account whose paid period ended without this app
 * being told.
 *
 * The webhook is how it is normally told, and Stripe repeats a webhook for
 * three days. But "normally" is not what stands between someone and a year of
 * Plus they stopped paying for: one lost message and the plan column says
 * Plus for ever. So when an account on a paid plan is looked up and its period
 * ended more than a day ago, Stripe is asked.
 *
 * Returns the plan column if it was checked, or null if there was nothing to
 * check or Stripe could not be asked — the stored plan then stands. Never
 * throws: this runs on the way to every page a signed-in person opens.
 */
export async function refreshIfStale(user: {
  id: string;
  plan: string;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
}): Promise<string | null> {
  if (user.plan !== "plus" || !user.stripeSubscriptionId || !user.stripeCurrentPeriodEnd) return null;
  if (user.stripeCurrentPeriodEnd.getTime() + STALE_AFTER_MS > Date.now()) return null;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const last = lastCheck.get(user.stripeSubscriptionId);
  if (last && Date.now() - last < RECHECK_MS) return null;
  lastCheck.set(user.stripeSubscriptionId, Date.now());
  try {
    return await applySubscription(user.id, user.stripeSubscriptionId);
  } catch (e) {
    console.error(`[stripe] could not re-check a subscription: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * End everything an account has at Stripe, before the account is deleted.
 *
 * Deleting the customer there cancels its subscription at once and removes
 * the customer record. What Stripe keeps is what the law on bookkeeping makes
 * it keep: the receipts.
 *
 * False means a subscription may still be running and the account must not be
 * deleted yet. An account that never bought anything has nothing at Stripe
 * and is true without a call being made.
 */
export async function closeCustomer(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!user?.stripeCustomerId) return true;
  try {
    await getStripe().customers.del(user.stripeCustomerId);
    return true;
  } catch (e) {
    // Already gone there: nothing left to end.
    if ((e as { code?: string })?.code === "resource_missing") return true;
    console.error(`[stripe] could not close a customer: ${e instanceof Error ? e.message : String(e)}`);
    // With no subscription on record there is nothing that could be charged;
    // a customer record left behind is not a reason to refuse the delete.
    return !user.stripeSubscriptionId;
  }
}
