// Single source of truth for what each tier includes. Pricing tables, paywalls
// and server-side gates all read this — don't hard-code tier rules elsewhere.
//
// Same shape as ChordSheetMaker's, deliberately: when the two are extracted
// into packages/core the only difference should be the feature keys.

/**
 * Prices are in SEK, and the Stripe prices MUST be created in SEK too — a
 * price's currency is fixed once created, so a mismatch means making new ones
 * and swapping the ids.
 *
 * SEK rather than USD because the Stripe account settles in SEK: every USD
 * charge would be converted on the way in, and Stripe's FX margin is material
 * on a 59 kr subscription. ChordSheetMaker bills in USD; this is the one place
 * the two products deliberately differ.
 *
 * Amounts are what the customer pays INCLUDING VAT. The Stripe prices are set
 * to tax-inclusive to match, since these are consumer prices and EU consumer
 * pricing is quoted with VAT included.
 */
export const CURRENCY = "kr";

export type Plan = "free" | "monthly" | "yearly";

export type Feature =
  | "recipeLimit" // max recipes (number = limit, true = unlimited)
  | "pdfExport"
  | "sharing"
  | "collections" // folders/categories — free, see below
  | "aiImport";

export interface PlanConfig {
  name: string;
  price: number;
  description: string;
  stripePriceId: string | undefined;
  isRecurring: boolean;
  features: Record<Feature, boolean | number>;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    description: "No credit card required",
    stripePriceId: undefined,
    isRecurring: false,
    features: {
      recipeLimit: 10,
      pdfExport: false,
      sharing: false,
      // Deliberately free, as in ChordSheetMaker: organising is what builds the
      // habit of coming back, and it feeds the limit rather than competing with it.
      collections: true,
      // AI import is the thing worth trying before paying — gating it would hide
      // the differentiator behind the paywall.
      aiImport: true,
    },
  },
  monthly: {
    name: "Monthly",
    price: 59,
    description: "Billed monthly",
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
    isRecurring: true,
    features: {
      recipeLimit: true,
      pdfExport: true,
      sharing: true,
      collections: true,
      aiImport: true,
    },
  },
  yearly: {
    name: "Yearly",
    price: 449,
    description: "Billed annually — two months free",
    stripePriceId: process.env.STRIPE_PRICE_YEARLY,
    isRecurring: true,
    features: {
      recipeLimit: true,
      pdfExport: true,
      sharing: true,
      collections: true,
      aiImport: true,
    },
  },
};

/** Resolves an expired or cancelled subscription back to "free". */
export function planFromUser(user: {
  plan: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  stripeSubscriptionStatus?: string | null;
}): Plan {
  const plan = (user.plan ?? "free") as Plan;
  if (plan === "free") return "free";
  if (user.stripeSubscriptionStatus === "canceled") return "free";
  if (user.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd.getTime() < Date.now()) {
    return "free";
  }
  return PLANS[plan] ? plan : "free";
}

export function getRecipeLimit(plan: Plan): number | null {
  const v = PLANS[plan].features.recipeLimit;
  return typeof v === "number" ? v : null;
}
