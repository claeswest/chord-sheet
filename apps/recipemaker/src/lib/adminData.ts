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
import { PLANS } from "./plans";

const DAY = 86_400_000;

export type Overview = {
  users: { total: number; last7: number; last30: number };
  recipes: { total: number; withPicture: number; shared: number };
  plans: { free: number; monthly: number; yearly: number };
  subscriptions: { trialing: number; active: number; leaving: number };
  /**
   * Monthly recurring revenue, GROSS.
   *
   * The prices are tax-inclusive — $5 is what the customer pays, VAT included
   * — so this is not what lands in the bank. The VAT rate depends on each
   * customer's country, so the net figure can't be derived from what's stored
   * here; Stripe's own reporting is the place for that. Labelled accordingly
   * in the UI rather than quietly overstating.
   */
  mrr: { gross: number; inTrials: number };
};

/** Everything a yearly plan contributes in one month. */
function monthlyValue(plan: "monthly" | "yearly", prices: { monthly: number; yearly: number }) {
  return plan === "monthly" ? prices.monthly : prices.yearly / 12;
}

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

  // Counted per plan and status so a trial isn't billed as revenue it hasn't
  // earned yet, and shows separately as what it would be worth if it converts.
  const prices = { monthly: PLANS.monthly.price, yearly: PLANS.yearly.price };
  const [payingMonthly, payingYearly, trialMonthly, trialYearly] = await Promise.all([
    prisma.user.count({ where: { plan: "monthly", stripeSubscriptionStatus: "active" } }),
    prisma.user.count({ where: { plan: "yearly", stripeSubscriptionStatus: "active" } }),
    prisma.user.count({ where: { plan: "monthly", stripeSubscriptionStatus: "trialing" } }),
    prisma.user.count({ where: { plan: "yearly", stripeSubscriptionStatus: "trialing" } }),
  ]);

  const gross =
    payingMonthly * monthlyValue("monthly", prices) + payingYearly * monthlyValue("yearly", prices);
  const inTrials =
    trialMonthly * monthlyValue("monthly", prices) + trialYearly * monthlyValue("yearly", prices);

  return {
    users: { total: users, last7, last30 },
    recipes: { total: recipes, withPicture, shared },
    plans: { free: users - monthly - yearly, monthly, yearly },
    subscriptions: { trialing, active, leaving },
    mrr: { gross: Math.round(gross), inTrials: Math.round(inTrials) },
  };
}

export type UserPage = {
  users: (AdminUser & { latestRecipes: { id: string; title: string }[] })[];
  total: number;
  page: number;
  pages: number;
};

/**
 * The people, searchable and paged.
 *
 * The recipe titles come along so a row can be expanded without a second
 * round trip — five is enough to tell whether someone is using the product or
 * signed up and stopped, which is the only question this page answers.
 */
export async function findUsers(query: string, page = 1, perPage = 25): Promise<UserPage> {
  const q = query.trim();
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * perPage,
    take: perPage,
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
      recipes: { orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true } },
    },
  });

  return {
    total,
    page: current,
    pages,
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      status: u.stripeSubscriptionStatus,
      cancelAt: u.stripeCancelAt,
      periodEnd: u.stripeCurrentPeriodEnd,
      createdAt: u.createdAt,
      recipes: u._count.recipes,
      latestRecipes: u.recipes,
    })),
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

export async function recentActivity(limit = 100, type?: string): Promise<ActivityRow[]> {
  const rows = await prisma.activityLog.findMany({
    where: type ? { type } : {},
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
