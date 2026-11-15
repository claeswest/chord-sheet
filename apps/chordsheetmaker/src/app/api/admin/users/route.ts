import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getSongLimit } from "@/lib/plans";
import { USER_FILTERS, parseUserFilter, parseUserSort, type UserFilter } from "@/lib/adminUserFilters";
import { ADMIN_USER_SELECT, toAdminUser } from "@/lib/adminUsers";

/** Sessions live 30 days and roll forward on use, so one that expires more than 23 days out was used this week. */
const ACTIVE_WEEK_MS = 23 * 24 * 60 * 60 * 1000;

/**
 * Who is in each tab, as database conditions — so pagination and counts are
 * over the filtered set, not a filtered page of twenty.
 *
 * Paying, trial and cancelling are disjoint, and "cancelling" outranks the
 * other two: someone who has cancelled keeps status "active" (or "trialing")
 * and their plan until the period ends, so by status alone they look like a
 * paying customer. That is the person most worth seeing separately.
 *
 * "paying" mirrors planFromUser: a lifetime purchase, or a monthly/yearly
 * subscription with an id whose paid-up period hasn't run out — and not a
 * trial, which has its own tab.
 *
 * Not-cancelling is spelled as "null or in the past" rather than NOT(> now):
 * in SQL, NOT applied to a comparison with NULL is NULL, so every user with no
 * cancellation date at all would silently drop out of the list.
 *
 * The behaviour tabs: "active" is anyone who used the app this week; "limit"
 * is a free account holding as many songs as the free plan allows — the
 * people with a reason to pay; "nosongs" signed up and never saved one.
 */
function filterWhere(filter: UserFilter, now: Date, atLimitIds: string[]): Prisma.UserWhereInput {
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
    case "active":
      return { sessions: { some: { expires: { gt: new Date(now.getTime() + ACTIVE_WEEK_MS) } } } };
    case "limit":
      return { plan: "free", id: { in: atLimitIds } };
    case "nosongs":
      return { songs: { none: {} } };
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
  const sort = parseUserSort(searchParams.get("sort"));
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const now = new Date();

  // Everyone holding at least the free plan's number of songs. Prisma can't
  // filter on a count, so the ids are fetched first; it is a short list.
  const songLimit = getSongLimit("free");
  const atLimitIds = songLimit
    ? (
        await prisma.$queryRaw<{ userId: string }[]>`
          select "userId" from "Song" group by 1 having count(*) >= ${songLimit}`
      ).map((r) => r.userId)
    : [];

  const searchWhere: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = { AND: [searchWhere, filterWhere(filter, now, atLimitIds)] };

  // Every tab's count, within the current search, for the numbers on the tabs.
  const countsP = Promise.all(
    USER_FILTERS.map((f) =>
      prisma.user.count({ where: { AND: [searchWhere, filterWhere(f, now, atLimitIds)] } }),
    ),
  ).then((ns) => Object.fromEntries(USER_FILTERS.map((f, i) => [f, ns[i]])) as Record<UserFilter, number>);

  const skip = (page - 1) * limit;

  // "Last active" lives on another table (the newest session), which Prisma
  // can't order by. So: the matching ids, ordered and cut to a page in SQL,
  // then those rows fetched and put back in that order.
  async function pageByLastActive() {
    const ids = (await prisma.user.findMany({ where, select: { id: true } })).map((u) => u.id);
    const ordered =
      dir === "asc"
        ? await prisma.$queryRaw<{ id: string }[]>`
            select u.id from "User" u
            left join (select "userId", max(expires) as e from "Session" group by 1) s on s."userId" = u.id
            where u.id = any(${ids}::text[])
            order by s.e asc nulls last, u.id asc offset ${skip} limit ${limit}`
        : await prisma.$queryRaw<{ id: string }[]>`
            select u.id from "User" u
            left join (select "userId", max(expires) as e from "Session" group by 1) s on s."userId" = u.id
            where u.id = any(${ids}::text[])
            order by s.e desc nulls last, u.id asc offset ${skip} limit ${limit}`;
    const pageIds = ordered.map((r) => r.id);
    const rows = await prisma.user.findMany({ where: { id: { in: pageIds } }, select: ADMIN_USER_SELECT });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return pageIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
  }

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "joined" ? [{ createdAt: dir }, { id: "asc" }]
    : sort === "songs" ? [{ songs: { _count: dir } }, { id: "asc" }]
    : [orderFor(filter), { id: "asc" }];

  const [total, counts, users] = await Promise.all([
    prisma.user.count({ where }),
    countsP,
    sort === "active"
      ? pageByLastActive()
      : prisma.user.findMany({ where, orderBy, skip, take: limit, select: ADMIN_USER_SELECT }),
  ]);

  return NextResponse.json({
    users: users.map(toAdminUser),
    total,
    counts,
    filter,
    sort,
    dir,
    page,
    pages: Math.ceil(total / limit),
  });
}
