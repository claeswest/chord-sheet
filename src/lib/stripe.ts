import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const FREE_SONG_LIMIT = 20;

export function isUserPro(user: {
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): boolean {
  if (!user.stripeSubscriptionId || !user.stripeCurrentPeriodEnd) return false;
  return user.stripeCurrentPeriodEnd > new Date();
}
