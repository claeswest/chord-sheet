export type Plan = "free" | "monthly" | "yearly" | "lifetime"; // lifetime hidden for now

export interface PlanConfig {
  name: string;
  price: number; // USD/month equivalent
  description: string;
  stripePriceId: string | undefined;
  isRecurring: boolean;
  features: Record<Feature, boolean | number>;
}

export type Feature =
  | "songLimit"       // max songs (number = limit, true = unlimited)
  | "pdfExport"       // true = any song, number = for that many songs
  | "sharing"         // true = any song, number = for that many songs
  | "setlists"
  | "chordTranspose"  // already built, free for all
  | "aiApps"          // connect ChatGPT, Claude… to the library (/oauth, /api/mcp)
  | "prioritySupport";

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    description: "No credit card required",
    stripePriceId: undefined,
    isRecurring: false,
    features: {
      songLimit: 5,
      // A taste rather than a lock (15 Nov 2026). Nobody bought what they had
      // never been able to try, and a share link is the one thing here that
      // puts the product in front of other musicians: it opens with a "make
      // your own" button. Counted per song, not per use — see lib/allowance.ts.
      pdfExport: 1,
      sharing: 2,
      // Deliberately free: organising songs builds the return habit that the
      // paid features later monetise. The API never gated it anyway.
      setlists: true,
      chordTranspose: true,
      // Free as well: an app can only add songs up to the song limit above,
      // so it is another way into the library, not a way round the paywall.
      // Not in the price lists yet, which name their own rows.
      aiApps: true,
      prioritySupport: false,
    },
  },
  monthly: {
    name: "Monthly",
    price: 9,
    description: "Billed monthly",
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
    isRecurring: true,
    features: {
      songLimit: true,
      pdfExport: true,
      sharing: true,
      setlists: true,
      chordTranspose: true,
      aiApps: true,
      prioritySupport: false,
    },
  },
  yearly: {
    name: "Yearly",
    price: 79,
    description: "Billed annually — save 27%",
    stripePriceId: process.env.STRIPE_PRICE_YEARLY,
    isRecurring: true,
    features: {
      songLimit: true,
      pdfExport: true,
      sharing: true,
      setlists: true,
      chordTranspose: true,
      aiApps: true,
      prioritySupport: true,
    },
  },
  lifetime: {
    name: "Lifetime",
    price: 199,
    description: "One-time payment, forever",
    stripePriceId: process.env.STRIPE_PRICE_LIFETIME,
    isRecurring: false,
    features: {
      songLimit: true,
      pdfExport: true,
      sharing: true,
      setlists: true,
      chordTranspose: true,
      aiApps: true,
      prioritySupport: true,
    },
  },
};

/** What a year on the yearly plan saves against twelve monthly payments, in whole percent. */
export function yearlySavingPercent(): number {
  return Math.round((1 - PLANS.yearly.price / (PLANS.monthly.price * 12)) * 100);
}

/** The yearly price spread over twelve months, e.g. "6.58". */
export function yearlyPerMonth(): string {
  return (PLANS.yearly.price / 12).toFixed(2);
}

export function canUseFeature(plan: Plan, feature: Feature): boolean {
  const value = PLANS[plan].features[feature];
  return value === true || (typeof value === "number" && value > 0);
}

/**
 * How many songs a plan may use a feature on: null for no limit, 0 when the
 * plan does not include it.
 */
export function featureLimit(plan: Plan, feature: Feature): number | null {
  const value = PLANS[plan].features[feature];
  if (value === true) return null;
  return typeof value === "number" ? value : 0;
}

/**
 * How a plan's allowance of a feature reads in a price list, where it needs
 * more than the feature's name: "Up to 5 songs", "Share links for 2 songs".
 * null when the plain name will do.
 */
export function allowanceLabel(feature: Feature, value: boolean | number): string | null {
  if (feature === "songLimit") return value === true ? "Unlimited songs" : `Up to ${value} songs`;
  if (typeof value !== "number" || value <= 0) return null;
  const songs = `${value} song${value === 1 ? "" : "s"}`;
  if (feature === "pdfExport") return `PDF export for ${songs}`;
  if (feature === "sharing") return `Share links for ${songs}`;
  return null;
}

export function getSongLimit(plan: Plan): number | null {
  const value = PLANS[plan].features.songLimit;
  if (value === true) return null; // unlimited
  return value as number;
}

export function planFromUser(user: {
  plan?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  stripeSubscriptionStatus?: string | null;
}): Plan {
  const raw = user.plan ?? "free";
  if (raw === "monthly" || raw === "yearly") {
    if (!user.stripeSubscriptionId) return "free";
    // Trialing users get full plan access
    if (user.stripeSubscriptionStatus === "trialing") return raw as Plan;
    // Active subscriptions must not be expired
    if (!user.stripeCurrentPeriodEnd) return "free";
    if (user.stripeCurrentPeriodEnd < new Date()) return "free";
  }
  return raw as Plan;
}

export function isOnTrial(user: {
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): boolean {
  return user.stripeSubscriptionStatus === "trialing";
}

export function trialDaysRemaining(user: {
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): number | null {
  if (!isOnTrial(user) || !user.stripeCurrentPeriodEnd) return null;
  const ms = user.stripeCurrentPeriodEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
