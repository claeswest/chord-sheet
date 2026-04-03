export type Plan = "free" | "monthly" | "yearly" | "lifetime";

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
  | "pdfExport"
  | "sharing"
  | "setlists"
  | "chordTranspose"  // already built, free for all
  | "prioritySupport";

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    description: "Get started for free",
    stripePriceId: undefined,
    isRecurring: false,
    features: {
      songLimit: 20,
      pdfExport: false,
      sharing: false,
      setlists: false,
      chordTranspose: true,
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
      prioritySupport: true,
    },
  },
};

export function canUseFeature(plan: Plan, feature: Feature): boolean {
  const value = PLANS[plan].features[feature];
  return value === true || (typeof value === "number" && value > 0);
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
}): Plan {
  const raw = user.plan ?? "free";
  // For recurring plans, verify subscription is still active
  if (raw === "monthly" || raw === "yearly") {
    if (!user.stripeSubscriptionId || !user.stripeCurrentPeriodEnd) return "free";
    if (user.stripeCurrentPeriodEnd < new Date()) return "free";
  }
  return raw as Plan;
}
