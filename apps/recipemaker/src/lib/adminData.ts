// The numbers behind /admin.
//
// Separate counts rather than one clever aggregate: the Neon HTTP driver
// cannot run transactions, and a pile of independent COUNTs is both safe under
// it and readable. At this size the query count is not the problem worth
// solving.
//
// Everything here reads across all users, which is exactly why every page that
// calls it starts with requireAdmin() (lib/admin.ts). Nothing in this file
// checks permissions itself — keep it that way, so there is one check to get
// right rather than one per query.

import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma";
import { cancellationPending } from "@clavos/core/billing";
import { PLANS, getRecipeLimit, planFromUser } from "./plans";

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

// ── When someone was last here ───────────────────────────────────────────────
//
// Nothing stores it, so it is read from three things that move when a person
// uses the product, and the latest one wins:
//
//   - their newest session. A session lasts SESSION_DAYS and is pushed forward
//     as it is used, so its expiry minus that is roughly the last visit — the
//     only one of the three that notices someone who came back just to cook;
//   - the newest thing they did that the activity log records;
//   - the newest edit to a recipe, since saving a recipe is not logged.

/** NextAuth's default session lifetime; lib/auth.ts doesn't set another. */
const SESSION_DAYS = 30;

/**
 * Rows the person did not cause: Stripe's webhook and the daily email job
 * write to someone's log without them being anywhere near the site.
 */
const NOT_THEIR_OWN = [{ type: { startsWith: "sub_" } }, { type: { startsWith: "email_" } }];

function latest(...dates: (Date | null | undefined)[]): Date | null {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  // Never in the future: a session's expiry is an estimate, not a timestamp.
  return times.length ? new Date(Math.min(Math.max(...times), Date.now())) : null;
}

const sessionSeen = (expires: Date | undefined) =>
  expires ? new Date(expires.getTime() - SESSION_DAYS * DAY) : null;

/** The newest logged action of each person the filter matches, in one query. */
async function lastOwnAction(where: Prisma.ActivityLogWhereInput): Promise<Map<string, Date>> {
  const rows = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { AND: [where, { NOT: NOT_THEIR_OWN }] },
    _max: { createdAt: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) if (r.userId && r._max.createdAt) map.set(r.userId, r._max.createdAt);
  return map;
}

// ── The list of people ───────────────────────────────────────────────────────

export const SORTS = ["joined", "active", "recipes"] as const;
export type Sort = (typeof SORTS)[number];

export const SHOWS = ["all", "paying", "trial", "leaving", "free", "empty"] as const;
export type Show = (typeof SHOWS)[number];

/** Each filter as a question the User table can answer. */
function showing(show: Show): Prisma.UserWhereInput {
  switch (show) {
    case "paying":
      return { plan: { not: "free" }, stripeSubscriptionStatus: "active" };
    case "trial":
      return { stripeSubscriptionStatus: "trialing" };
    case "leaving":
      // A date still ahead. One that has passed belongs to a subscription
      // that already ended, and the webhook clears it then.
      return { stripeCancelAt: { gt: new Date() } };
    case "free":
      return { plan: "free" };
    case "empty":
      return { recipes: { none: {} } };
    default:
      return {};
  }
}

const LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  plan: true,
  stripeSubscriptionStatus: true,
  stripeCancelAt: true,
  stripeCurrentPeriodEnd: true,
  createdAt: true,
  _count: { select: { recipes: true } },
  recipes: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
  sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof LIST_SELECT }>;

export type UserPage = {
  users: (AdminUser & { lastActive: Date | null })[];
  total: number;
  page: number;
  pages: number;
};

/**
 * The people: searchable, filtered, sorted and paged. Each row leads to the
 * person's own page, which is where their recipes are.
 */
export async function findUsers(opts: {
  query?: string;
  page?: number;
  sort?: Sort;
  show?: Show;
  perPage?: number;
}): Promise<UserPage> {
  const { sort = "joined", show = "all", perPage = 25 } = opts;
  const q = (opts.query ?? "").trim();
  const where: Prisma.UserWhereInput = {
    AND: [
      showing(show),
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const total = await prisma.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, opts.page ?? 1), pages);
  const skip = (current - 1) * perPage;

  const acted = await lastOwnAction({ user: where });
  const seen = (u: ListRow) =>
    latest(sessionSeen(u.sessions[0]?.expires), acted.get(u.id), u.recipes[0]?.updatedAt);

  // Joined and recipes are things the database can sort by. Last active is
  // not — it is worked out from three tables (see above) — so for that order
  // everyone matching is dated first and the page is cut afterwards. That is a
  // row of three dates per person, fine for thousands of people; the day it
  // isn't, store a lastSeenAt on User instead of making this cleverer.
  let rows: ListRow[];
  if (sort === "active") {
    const everyone = await prisma.user.findMany({ where, select: LIST_SELECT });
    const at = (u: ListRow) => seen(u)?.getTime() ?? 0;
    rows = everyone
      .sort((a, b) => at(b) - at(a) || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(skip, skip + perPage);
  } else {
    rows = await prisma.user.findMany({
      where,
      orderBy:
        sort === "recipes"
          ? [{ recipes: { _count: "desc" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      skip,
      take: perPage,
      select: LIST_SELECT,
    });
  }

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
      lastActive: seen(u),
    })),
  };
}

// ── Who needs attention ──────────────────────────────────────────────────────
//
// The overview's short lists: the handful of people for whom today is a better
// day to do something than next week. Each is small by construction — a
// window of days, or a state few accounts are in.

export type Person = { id: string; name: string | null; email: string };

export type Attention = {
  /** The last payment did not go through. */
  paymentProblems: (Person & { status: string })[];
  /** Trials that turn into a charge within TRIAL_SOON_DAYS. Soonest first. */
  trialsEnding: (Person & { at: Date })[];
  /** Cancelled, access still running. Soonest first. */
  leaving: (Person & { at: Date })[];
  /** Signed up between a day and QUIET_DAYS ago and has no recipe. */
  neverStarted: (Person & { joined: Date })[];
  /** On the free plan with NEAR_LIMIT recipes or fewer to go. */
  nearLimit: (Person & { recipes: number })[];
  /** The free plan's limit, from plans.ts, so the page can say "8 of 10". */
  limit: number | null;
};

const TRIAL_SOON_DAYS = 3;
const QUIET_DAYS = 14;
const NEAR_LIMIT = 2;
const PERSON = { id: true, name: true, email: true } as const;

export async function getAttention(): Promise<Attention> {
  const now = new Date();
  const limit = getRecipeLimit("free");

  const [problems, trials, leaving, neverStarted, full] = await Promise.all([
    prisma.user.findMany({
      where: { stripeSubscriptionStatus: { in: ["past_due", "unpaid", "incomplete"] } },
      select: { ...PERSON, stripeSubscriptionStatus: true },
    }),
    prisma.user.findMany({
      where: {
        stripeSubscriptionStatus: "trialing",
        stripeCurrentPeriodEnd: { gt: now, lt: new Date(now.getTime() + TRIAL_SOON_DAYS * DAY) },
        // Someone who has already cancelled is in "leaving", not about to pay.
        OR: [{ stripeCancelAt: null }, { stripeCancelAt: { lte: now } }],
      },
      orderBy: { stripeCurrentPeriodEnd: "asc" },
      select: { ...PERSON, stripeCurrentPeriodEnd: true },
    }),
    prisma.user.findMany({
      where: { stripeCancelAt: { gt: now } },
      orderBy: { stripeCancelAt: "asc" },
      select: { ...PERSON, stripeCancelAt: true },
    }),
    prisma.user.findMany({
      where: {
        // Not the last day: someone who signed up an hour ago has not failed
        // to start, they have not had the evening yet.
        createdAt: {
          gt: new Date(now.getTime() - QUIET_DAYS * DAY),
          lt: new Date(now.getTime() - DAY),
        },
        recipes: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { ...PERSON, createdAt: true },
    }),
    // Counted in the database, so this reads only the accounts that are close.
    limit === null
      ? Promise.resolve([])
      : prisma.recipe.groupBy({
          by: ["userId"],
          _count: { _all: true },
          having: { userId: { _count: { gte: Math.max(1, limit - NEAR_LIMIT) } } },
        }),
  ]);

  // Many recipes only matters on the free plan, and whether someone is on it
  // is planFromUser's call (a lapsed subscription counts as free), not a
  // column's.
  const counts = new Map(full.map((r) => [r.userId, r._count._all]));
  const candidates = counts.size
    ? await prisma.user.findMany({
        where: { id: { in: [...counts.keys()] } },
        select: {
          ...PERSON,
          plan: true,
          stripeCurrentPeriodEnd: true,
          stripeSubscriptionStatus: true,
        },
      })
    : [];

  return {
    paymentProblems: problems.map((u) => ({ ...u, status: u.stripeSubscriptionStatus ?? "" })),
    trialsEnding: trials.map((u) => ({ ...u, at: u.stripeCurrentPeriodEnd! })),
    leaving: leaving.map((u) => ({ ...u, at: u.stripeCancelAt! })),
    neverStarted: neverStarted.map((u) => ({ ...u, joined: u.createdAt })),
    nearLimit: candidates
      .filter((u) => planFromUser(u) === "free")
      .map((u) => ({ id: u.id, name: u.name, email: u.email, recipes: counts.get(u.id) ?? 0 }))
      .sort((a, b) => b.recipes - a.recipes),
    limit,
  };
}

// ── What the AI is used for, and roughly what it costs ───────────────────────

/**
 * Rough cost of one AI request, in US dollars. Estimates, for a sense of
 * scale — the bill is at the provider.
 *
 * The basis is the one ChordSheetMaker's dashboard uses (its
 * adminInsightsShared.ts, checked November 2026), because both apps call the
 * same two models through @clavos/core/ai: Gemini Flash text at about $0.30
 * per million tokens in and $2.50 out, a request here being a few thousand
 * tokens; and an image at about $0.039. Update both files when the provider's
 * prices or the models change.
 */
export const AI_COST_USD = {
  /** Reading a recipe out of pasted text, a web page or a photograph. */
  import: 0.004,
  /** The same call, made from the landing page by someone without an account. */
  tried: 0.004,
  /** The checker: the whole recipe in, a list of corrections out. */
  check: 0.004,
  /** One attempt at a style. A rejected first answer is asked again, and paid for again. */
  style: 0.002,
  /** One generated picture — by a wide margin the most expensive thing here. */
  picture: 0.04,
} as const;
export type AiKind = keyof typeof AI_COST_USD;

/** The activity-log event that records each kind of AI request. */
const AI_EVENT: Record<string, AiKind> = {
  recipe_imported: "import",
  tried_import: "tried",
  recipe_reviewed: "check",
  recipe_styled: "style",
  recipe_image_generated: "picture",
};

export type AiWeek = {
  /** The Monday the week starts on (UTC). */
  start: Date;
  counts: Record<AiKind, number>;
  /** Of the imports, how many were photographs. */
  photos: number;
  /** Different accounts that used any of it (visitors are not accounts). */
  people: number;
  cost: number;
};

/** Monday 00:00 UTC of the week `d` falls in. */
function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/**
 * AI requests per week, newest first, with what they roughly cost.
 *
 * Read from the activity log, which records a request when it SUCCEEDS. One
 * that failed — a page that would not parse, a picture the model declined, a
 * style rejected twice — was paid for and is not here, so the true figure is a
 * little higher than this one. The page says so.
 */
export async function aiUsage(weeks = 12): Promise<AiWeek[]> {
  const first = new Date(weekStart(new Date()).getTime() - (weeks - 1) * 7 * DAY);
  const rows = await prisma.activityLog.findMany({
    where: { type: { in: Object.keys(AI_EVENT) }, createdAt: { gte: first } },
    select: { type: true, createdAt: true, userId: true, meta: true },
  });

  const empty = (): Record<AiKind, number> => ({
    import: 0,
    tried: 0,
    check: 0,
    style: 0,
    picture: 0,
  });
  const byWeek = new Map<number, AiWeek & { ids: Set<string> }>();
  for (let i = 0; i < weeks; i++) {
    const start = new Date(first.getTime() + i * 7 * DAY);
    byWeek.set(start.getTime(), {
      start,
      counts: empty(),
      photos: 0,
      people: 0,
      cost: 0,
      ids: new Set(),
    });
  }

  for (const r of rows) {
    const week = byWeek.get(weekStart(r.createdAt).getTime());
    if (!week) continue;
    const kind = AI_EVENT[r.type];
    const m = (r.meta ?? {}) as Record<string, unknown>;
    // A style that needed its second attempt was two requests.
    const requests = kind === "style" && m.attempt === 2 ? 2 : 1;
    week.counts[kind] += 1;
    week.cost += requests * AI_COST_USD[kind];
    if (kind === "import" && m.from === "photo") week.photos += 1;
    if (r.userId) week.ids.add(r.userId);
  }

  return [...byWeek.values()]
    .map(({ ids, ...w }) => ({ ...w, people: ids.size }))
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

// ── One person ───────────────────────────────────────────────────────────────

export type AdminRecipeRow = {
  id: string;
  title: string;
  description: string | null;
  /** The small picture the library cards use. */
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * How the AI import was fed, when the recipe came in that way: the `from`
   * of its import event, or "try" for one kept from the paste box on the
   * landing page. Null means no import was logged for it — typed in by hand.
   */
  importedFrom: string | null;
  /** Has a share link out. */
  shared: boolean;
};

export type AdminUserDetail = AdminUser & {
  lastActive: Date | null;
  marketingOptOut: boolean;
  /** Has been through checkout at some point, so Stripe has a page on them. */
  hasStripeCustomer: boolean;
  collections: number;
  shares: number;
  recipeList: AdminRecipeRow[];
  timeline: ActivityRow[];
  /** All their events, of which `timeline` is the newest. */
  timelineTotal: number;
};

const TIMELINE = 50;

/** Everything /admin/users/[id] shows. Null when there is no such person. */
export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeSubscriptionStatus: true,
      stripeCancelAt: true,
      stripeCurrentPeriodEnd: true,
      marketingOptOut: true,
      // Only to say whether there is one — the id itself stays on the server.
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { recipes: true, categories: true, shares: true } },
      sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
    },
  });
  if (!u) return null;

  const [recipes, events, timelineTotal, imports, shares, acted] = await Promise.all([
    // Titles and thumbnails only. The recipe itself — and its full-size
    // pictures, which live inside `content` — is read one at a time, by
    // getAdminRecipe, when someone opens it.
    prisma.recipe.findMany({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: TIMELINE,
      select: { id: true, type: true, createdAt: true, meta: true },
    }),
    prisma.activityLog.count({ where: { userId: id } }),
    // Oldest first, so that when a recipe was imported twice the later import
    // is the one left standing in the map below.
    prisma.activityLog.findMany({
      where: { userId: id, type: { in: ["recipe_imported", "claimed_try"] } },
      orderBy: { createdAt: "asc" },
      select: { type: true, meta: true },
    }),
    prisma.share.findMany({ where: { userId: id }, select: { recipeId: true } }),
    lastOwnAction({ userId: id }),
  ]);

  const importedFrom = new Map<string, string>();
  for (const e of imports) {
    const m = (e.meta ?? {}) as Record<string, unknown>;
    if (typeof m.recipeId !== "string") continue;
    importedFrom.set(
      m.recipeId,
      e.type === "claimed_try" ? "try" : typeof m.from === "string" ? m.from : "text",
    );
  }
  const shared = new Set(shares.map((s) => s.recipeId).filter(Boolean));

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    status: u.stripeSubscriptionStatus,
    cancelAt: u.stripeCancelAt,
    periodEnd: u.stripeCurrentPeriodEnd,
    createdAt: u.createdAt,
    marketingOptOut: u.marketingOptOut,
    recipes: u._count.recipes,
    collections: u._count.categories,
    shares: u._count.shares,
    lastActive: latest(sessionSeen(u.sessions[0]?.expires), acted.get(id), recipes[0]?.updatedAt),
    hasStripeCustomer: Boolean(u.stripeCustomerId),
    recipeList: recipes.map((r) => ({
      ...r,
      importedFrom: importedFrom.get(r.id) ?? null,
      shared: shared.has(r.id),
    })),
    timeline: events.map((e) => ({ ...e, userId: id, email: u.email })),
    timelineTotal,
  };
}

/**
 * One recipe of one person, whole, for reading.
 *
 * Both ids are in the filter, so the address has to name the recipe's real
 * owner — a recipe id pasted under someone else's page finds nothing.
 *
 * This is the one place a recipe is read without its owner's session, which
 * recipeDb.ts otherwise makes impossible on purpose. It is here, and not
 * there, so that file keeps its guarantee; and it reads, never writes.
 */
export async function getAdminRecipe(userId: string, recipeId: string) {
  return prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { user: { select: { name: true, email: true } } },
  });
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
  /** Null for what a visitor without an account did. */
  userId: string | null;
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
      userId: true,
      user: { select: { email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    createdAt: r.createdAt,
    userId: r.userId,
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
