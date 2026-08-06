import Stripe from "stripe";

// Mirrors apps/chordsheetmaker/src/lib/stripe.ts. The two products bill the
// same way on purpose — see packages/core/README.md on keeping them similar
// enough that one could be sold or retired without untangling the other.
//
// Lazy, not module-scope: importing this file must not throw when the key is
// absent, or every route that touches it breaks in a deployment that simply
// has not been given Stripe keys yet.

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

/** Whether billing is wired up at all. Pricing shows, but buying is hidden. */
export function stripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_YEARLY),
  );
}
