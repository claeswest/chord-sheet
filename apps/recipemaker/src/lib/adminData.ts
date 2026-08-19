// The numbers behind /admin.
//
// Separate counts rather than one clever aggregate: the Neon HTTP driver
// cannot run transactions, and a pile of independent COUNTs is both safe under
// it and readable. At this size the query count is not the problem worth
// solving.
//
// Everything here reads across all users, which is exactly why isAdmin() gates
// the pages that call it. Nothing in this file checks permissions itself —
// keep it that way, so there is one place to get it wrong rather than six.

import { prisma } from "./prisma";
import { cancellationPending } from "@clavos/core/billing";

const DAY = 86_400_000;

export type Overview = {
  users: { total: number; last7: number; last30: number };
  recipes: { total: number; withPicture: number; shared: number };
  plans: { free: number; monthly: number; yearly: number };
  subscriptions: { trialing: number; active: number; leaving: number };
};

export async function getOverview(): Promise<Overview> {
  const since = (days: number) => ({ gte: new Date(Date.now() - days * DAY) });

  const [
    users,
    last7,
    last30,
    recipes,
    withPicture,
    shared,
    monthly,
    yearly,
    trialing,
    active,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: since(7) } }),
    prisma.user.count({ where: { createdAt: since(30) } }),
    prisma.recipe.count(),
    prisma.recipe.count({ where: { NOT: { imageUrl: null } } }),
    prisma.share.count(),
    prisma.user.count({ where: { plan: "monthly" } }),
    prisma.user.count({ where: { plan: "yearly" } }),
    prisma.user.count({ where: { stripeSubscriptionStatus: "trialing" } }),
    prisma.user.count({ where: { stripeSubscriptionStatus: "active" } }),
  ]);

  // "Leaving" has to be counted in JS, not SQL: it means a cancellation date
  // still in the future. A row keeps its date after the fact, so `NOT null`
  // would count everyone who ever cancelled.
  const withCancelDate = await prisma.user.findMany({
    where: { NOT: { stripeCancelAt: null } },
    select: { stripeCancelAt: true },
  });
  const leaving = withCancelDate.filter((u) => cancellationPending(u.stripeCancelAt)).length;

  return {
    users: { total: users, last7, last30 },
    recipes: { total: recipes, withPicture, shared },
    plans: { free: users - monthly - yearly, monthly, yearly },
    subscriptions: { trialing, active, leaving },
  };
}

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  status: string | null;
  cancelAt: Date | null;
  periodEnd: Date | null;
  createdAt: Date;
  recipes: number;
};

/** Most recent signups first — who arrived, and whether they did anything. */
export async function recentUsers(limit = 25): Promise<AdminUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeSubscriptionStatus: true,
      stripeCancelAt: true,
      stripeCurrentPeriodEnd: true,
      createdAt: true,
      _count: { select: { recipes: true } },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    status: u.stripeSubscriptionStatus,
    cancelAt: u.stripeCancelAt,
    periodEnd: u.stripeCurrentPeriodEnd,
    createdAt: u.createdAt,
    recipes: u._count.recipes,
  }));
}

export type ActivityRow = {
  id: string;
  type: string;
  createdAt: Date;
  email: string | null;
  meta: unknown;
};

export async function recentActivity(limit = 100): Promise<ActivityRow[]> {
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      createdAt: true,
      meta: true,
      user: { select: { email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    createdAt: r.createdAt,
    email: r.user?.email ?? null,
    meta: r.meta,
  }));
}

/** How often each kind of event happens — what the product is actually used for. */
export async function activityTotals(): Promise<{ type: string; count: number }[]> {
  const rows = await prisma.activityLog.groupBy({
    by: ["type"],
    _count: { type: true },
  });
  return rows
    .map((r) => ({ type: r.type, count: r._count.type }))
    .sort((a, b) => b.count - a.count);
}
