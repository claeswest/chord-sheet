// The tiers, and what each one may do. The single source of truth: anything
// that limits or unlocks by plan reads it from here.
//
// There is one tier today. Accounts exist so that someone can keep their
// schedules; nothing is sold yet. The plan and Stripe columns are already on
// User (see prisma/schema.prisma), so adding a paid tier is a matter of adding
// it here and wiring checkout, not of changing a table.

export type Plan = "free";

export const PLANS: Record<Plan, { name: string; features: { scheduleLimit: number } }> = {
  free: {
    name: "Gratis",
    features: {
      // Not a paywall. A family has a handful of children and two terms a
      // year; a teacher has a few classes. Two hundred is far above either and
      // only there so that one account cannot fill the database.
      scheduleLimit: 200,
    },
  },
};

/** The plan an account is on. Everyone is on the only one there is. */
export function planFromUser(_user: { plan?: string | null }): Plan {
  return "free";
}
