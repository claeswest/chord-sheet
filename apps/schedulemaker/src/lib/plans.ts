// The tiers, and what each one may do. The single source of truth: anything
// that limits or unlocks by plan reads it from here.
//
// Two tiers since 22 Nov 2026. Gratis is the app as it always was. Plus is for
// whoever makes schedules for other people — a teacher, a coach, the person
// who runs the after-school club.
//
// Plus is sold as a subscription through Stripe, where the three settings for
// it exist (see lib/stripe.ts, `sellingEnabled`). Where they do not, nothing
// is for sale and the Plus page asks who wants it instead. What a subscription
// does to an account's plan is decided in one place, lib/subscription.ts.
//
// What Plus costs is not in this file. It is the price in Stripe that
// STRIPE_PRICE_PLUS names, and the Plus page reads the figure from there.

export type Plan = "free" | "plus";

export const PLANS: Record<
  Plan,
  {
    name: string;
    features: {
      /** How many schedules an account may keep. A guard, not a paywall — see below. */
      scheduleLimit: number;
      /** The styles marked `plus` in lib/themes.ts. */
      plusStyles: boolean;
      /** Turning on a link that always shows the latest saved version. See lib/linkDb.ts. */
      liveLink: boolean;
    };
  }
> = {
  free: {
    name: "Gratis",
    features: {
      // A family has a handful of children and two terms a year. Two hundred
      // is far above that and only there so one account cannot fill the
      // database.
      scheduleLimit: 200,
      plusStyles: false,
      liveLink: false,
    },
  },
  plus: {
    name: "Plus",
    features: {
      // Someone with several classes or teams, over several years.
      scheduleLimit: 2000,
      plusStyles: true,
      liveLink: true,
    },
  },
};

/**
 * The Stripe price that is Plus. A subscription to any other price is not
 * Plus, whoever holds it.
 *
 * Read when asked, not when the file loads: on a server that starts cold the
 * setting is there per request.
 */
export function plusPriceId(): string | undefined {
  return process.env.STRIPE_PRICE_PLUS || undefined;
}

/**
 * The plan an account is on.
 *
 * Two ways to be on Plus. The `plan` column says so — which is what a paid
 * subscription sets, and takes away again (lib/subscription.ts). Or the
 * account's address is listed in PLUS_EMAILS, a comma-separated setting on the
 * server: the way to give Plus to oneself or to someone trying it out, without
 * anyone paying and without touching the database.
 *
 * Server only: it reads a setting the browser must not be sent.
 */
export function planFromUser(user: { plan?: string | null; email?: string | null }): Plan {
  if (user.plan === "plus") return "plus";
  const email = user.email?.trim().toLowerCase();
  if (email) {
    const granted = (process.env.PLUS_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (granted.includes(email)) return "plus";
  }
  return "free";
}
