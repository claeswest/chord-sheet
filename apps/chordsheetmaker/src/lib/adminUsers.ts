// What the admin is shown about one user — the same shape in the list and on
// the user's own page, so the two can share their components.

import type { Prisma } from "@/generated/prisma";

export const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  plan: true,
  stripeSubscriptionStatus: true,
  stripeCurrentPeriodEnd: true,
  stripeCancelAt: true,
  stripeCustomerId: true, // mapped to a boolean below — the id never leaves the server
  marketingOptOut: true,
  lastMarketingEmailAt: true,
  createdAt: true,
  _count: { select: { songs: true, categories: true } },
  // Latest session — its expiry minus the 30-day session lifetime tells
  // us roughly when the user was last active (sessions roll on activity).
  sessions: {
    orderBy: { expires: "desc" },
    take: 1,
    select: { expires: true },
  },
  songs: {
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 5,
    select: { id: true, title: true, artist: true, createdAt: true, updatedAt: true },
  },
  categories: {
    orderBy: { order: "asc" },
    select: { id: true, name: true, parentId: true },
  },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

/**
 * Swap the Stripe customer id for the one fact the UI needs from it: whether
 * this person has ever been through checkout, and so has spent their trial.
 * (The user page's "Open in Stripe" goes through a redirect on the server.)
 */
export function toAdminUser({ stripeCustomerId, ...u }: Row) {
  return { ...u, hasSubscribedBefore: !!stripeCustomerId };
}
