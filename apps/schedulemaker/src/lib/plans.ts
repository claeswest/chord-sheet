// The tiers, and what each one may do. The single source of truth: anything
// that limits or unlocks by plan reads it from here.
//
// Two tiers since 22 Nov 2026. Gratis is the app as it always was. Plus is for
// whoever makes schedules for other people — a teacher, a coach, the person
// who runs the after-school club — and it cannot be bought yet: there is no
// checkout. What exists is the machinery (a plan on every account, features
// that ask it), one feature behind it (the extra styles, see lib/themes.ts),
// and a page that says what Plus will be and counts who wants it (/plus).
//
// The plan and Stripe columns have been on User from the start (see
// prisma/schema.prisma), so selling it later is a matter of wiring checkout to
// set `plan`, not of changing a table.

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
    },
  },
  plus: {
    name: "Plus",
    features: {
      // Someone with several classes or teams, over several years.
      scheduleLimit: 2000,
      plusStyles: true,
    },
  },
};

/**
 * The plan an account is on.
 *
 * Two ways to be on Plus today, neither of them paying. The `plan` column says
 * so — which is what checkout will set, and what can be set by hand in the
 * database. Or the account's address is listed in PLUS_EMAILS, a comma-separated
 * setting on the server: the way to give Plus to oneself or to someone trying
 * it out without touching the database at all.
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
