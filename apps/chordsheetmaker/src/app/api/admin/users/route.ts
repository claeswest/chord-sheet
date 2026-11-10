import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { USER_FILTERS, parseUserFilter, type UserFilter } from "@/lib/adminUserFilters";

/**
 * Who is in each tab, as database conditions — so pagination and counts are
 * over the filtered set, not a filtered page of twenty.
 *
 * The three are disjoint, and "cancelling" outranks the other two: someone who
 * has cancelled keeps status "active" (or "trialing") and their plan until the
 * period ends, so by status alone they look like a paying customer. That is
 * the person most worth seeing separately.
 *
 * "paying" mirrors planFromUser: a lifetime purchase, or a monthly/yearly
 * subscription with an id whose paid-up period hasn't run out — and not a
 * trial, which has its own tab.
 *
 * Not-cancelling is spelled as "null or in the past" rather than NOT(> now):
 * in SQL, NOT applied to a comparison with NULL is NULL, so every user with no
 * cancellation date at all would silently drop out of the list.
 */
function filterWhere(filter: UserFilter, now: Date): Prisma.UserWhereInput {
  const notCancelling: Prisma.UserWhereInput = {
    OR: [{ stripeCancelAt: null }, { stripeCancelAt: { lte: now } }],
  };
  switch (filter) {
    case "cancelling":
      return { stripeCancelAt: { gt: now } };
    case "trial":
      return {
        AND: [
          notCancelling,
          {
            plan: { in: ["monthly", "yearly"] },
            stripeSubscriptionId: { not: null },
            stripeSubscriptionStatus: "trialing",
          },
        ],
      };
    case "paying":
      return {
        AND: [
          notCancelling,
          {
            OR: [
              { plan: "lifetime" },
              {
                AND: [
                  {
                    plan: { in: ["monthly", "yearly"] },
                    stripeSubscriptionId: { not: null },
                    stripeCurrentPeriodEnd: { gte: now },
                  },
                  {
                    OR: [
                      { stripeSubscriptionStatus: null },
                      { stripeSubscriptionStatus: { not: "trialing" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
    default:
      return {};
  }
}

/** Soonest first where a date is the point of the tab: who leaves, who converts. */
function orderFor(filter: UserFilter): Prisma.UserOrderByWithRelationInput {
  if (filter === "cancelling") return { stripeCancelAt: "asc" };
  if (filter === "trial") return { stripeCurrentPeriodEnd: "asc" };
  return { createdAt: "desc" };
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  // "|| 1": parseInt gives NaN for "?page=abc", and Math.max(1, NaN) is NaN —
  // which went to Prisma as `skip` and answered with a 500.
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = 20;
  const search = searchParams.get("q")?.trim() ?? "";
  const filter = parseUserFilter(searchParams.get("filter"));
  const now = new Date();

  const searchWhere: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = { AND: [searchWhere, filterWhere(filter, now)] };

  // Every tab's count, within the current search, for the numbers on the tabs.
  const countsP = Promise.all(
    USER_FILTERS.map((f) =>
      prisma.user.count({ where: { AND: [searchWhere, filterWhere(f, now)] } }),
    ),
  ).then((ns) => Object.fromEntries(USER_FILTERS.map((f, i) => [f, ns[i]])) as Record<UserFilter, number>);

  const [total, counts, users] = await Promise.all([
    prisma.user.count({ where }),
    countsP,
    prisma.user.findMany({
      where,
      orderBy: [orderFor(filter), { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
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
      },
    }),
  ]);

  // Swap the Stripe customer id for the one fact the UI needs from it: whether
  // this person has ever been through checkout, and so has spent their trial.
  const safeUsers = users.map(({ stripeCustomerId, ...u }) => ({
    ...u,
    hasSubscribedBefore: !!stripeCustomerId,
  }));

  return NextResponse.json({
    users: safeUsers,
    total,
    counts,
    filter,
    page,
    pages: Math.ceil(total / limit),
  });
}
