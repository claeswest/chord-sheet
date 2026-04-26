import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

/** @deprecated use getStripe() */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const FREE_SONG_LIMIT = 20;

export function isUserPro(user: {
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): boolean {
  if (!user.stripeSubscriptionId || !user.stripeCurrentPeriodEnd) return false;
  return user.stripeCurrentPeriodEnd > new Date();
}
