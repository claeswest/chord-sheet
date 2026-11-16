// Everything on the admin dashboard beyond the head-count: who needs
// attention, whether the daily emails went out, where people drop off, what
// visitors without an account are doing, what the AI is costing, and the last
// twelve weeks as a trend.
//
// All of it is read from tables that already exist — users, songs, sessions
// and the activity log — so nothing here needs a migration. That also sets its
// limits, which the dashboard says out loud rather than hiding:
//   - a visitor is a random per-browser id, not a person, and is not linked
//     to the account they may create later;
//   - AI use by visitors is only known from 15 Nov 2026, when logging began;
//   - revenue has no history, so there is no revenue trend.

import { prisma } from "./prisma";
import { adminRecipients } from "./notify";
import { getSongLimit } from "./plans";
import { planAutoDrip } from "./autoDrip";

const DAY = 86_400_000;

import { AI_COST_USD, AI_KINDS, type AdminInsights, type AiKind } from "./adminInsightsShared";

export type { AdminInsights } from "./adminInsightsShared";

/** Monday 00:00 UTC of the week a moment falls in — what Postgres date_trunc('week') gives. */
function weekStart(ms: number): Date {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

type Bucket = { b: Date; n: number };
function fill(keys: string[], rows: Bucket[]): number[] {
  const byKey = new Map(rows.map((r) => [dayKey(new Date(r.b)), r.n]));
  return keys.map((k) => byKey.get(k) ?? 0);
}

export async function adminInsights(now = Date.now()): Promise<AdminInsights> {
  const nowDate = new Date(now);
  const d30 = new Date(now - 30 * DAY);
  const d14 = new Date(now - 14 * DAY);
  const d7 = new Date(now - 7 * DAY);
  const in3d = new Date(now + 3 * DAY);
  const limit = getSongLimit("free") ?? 0;

  // The founder's own account is testing, not custom. Left out of everything
  // about behaviour; left in for AI use, where a request costs the same
  // whoever made it.
  const admins = adminRecipients();
  const adminIds = admins.length
    ? (await prisma.user.findMany({ where: { email: { in: admins } }, select: { id: true } })).map((u) => u.id)
    : [];
  const notAdmin = { id: { notIn: adminIds } };

  const weeks: Date[] = [];
  const thisWeek = weekStart(now).getTime();
  for (let i = 11; i >= 0; i--) weeks.push(new Date(thisWeek - i * 7 * DAY));
  const since12w = weeks[0];
  const weekKeys = weeks.map(dayKey);

  const days30: string[] = [];
  for (let i = 29; i >= 0; i--) days30.push(dayKey(new Date(now - i * DAY)));
  const days14 = days30.slice(-14);

  const person = { id: true, name: true, email: true } as const;

  const [
    trialsEnding, paymentProblems, cancelling, atLimitRows,
    lastRunRow, lastAutoRows, sent7Rows, autoDailyRows,
    guestsWithSongRows, signups, signupsWithSong, trialRows, paidRows,
    guestVisitorRows, guestSongRows, guestStyledRows, accountSongRows, guestWeeklyRows,
    aiRows, aiDailyRows, aiSinceRows,
    signupWeekly, songWeekly, trialWeekly,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...notAdmin,
        stripeSubscriptionStatus: "trialing",
        stripeCurrentPeriodEnd: { gte: nowDate, lte: in3d },
        OR: [{ stripeCancelAt: null }, { stripeCancelAt: { lte: nowDate } }],
      },
      orderBy: { stripeCurrentPeriodEnd: "asc" },
      take: 10,
      select: { ...person, plan: true, stripeCurrentPeriodEnd: true },
    }),
    prisma.user.findMany({
      where: { ...notAdmin, stripeSubscriptionStatus: { in: ["past_due", "unpaid", "incomplete"] } },
      take: 10,
      select: { ...person, plan: true, stripeSubscriptionStatus: true },
    }),
    prisma.user.findMany({
      where: { ...notAdmin, stripeCancelAt: { gt: nowDate } },
      orderBy: { stripeCancelAt: "asc" },
      take: 10,
      select: { ...person, plan: true, stripeCancelAt: true },
    }),
    prisma.$queryRaw<{ id: string; name: string | null; email: string | null; songs: number; at: Date }[]>`
      select u.id, u.name, u.email, count(s.id)::int as songs, max(s."createdAt") as at
      from "User" u join "Song" s on s."userId" = u.id
      where u.plan = 'free' and not (u.id = any(${adminIds}::text[]))
      group by u.id
      having count(s.id) >= ${limit} and max(s."createdAt") >= ${d14}
      order by max(s."createdAt") desc
      limit 10`,

    prisma.activityLog.findFirst({
      where: { type: "job_run", meta: { path: ["job"], equals: "drip" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, meta: true },
    }),
    prisma.$queryRaw<{ at: Date | null }[]>`
      select max("createdAt") as at from "ActivityLog"
      where type = 'marketing_email' and meta->>'auto' = 'true'`,
    prisma.$queryRaw<{ auto: boolean; n: number }[]>`
      select coalesce(meta->>'auto', 'false') = 'true' as auto, count(*)::int as n
      from "ActivityLog" where type = 'marketing_email' and "createdAt" >= ${d7}
      group by 1`,
    prisma.$queryRaw<Bucket[]>`
      select date_trunc('day', "createdAt") as b, count(*)::int as n
      from "ActivityLog"
      where type = 'marketing_email' and meta->>'auto' = 'true' and "createdAt" >= ${d14}
      group by 1`,

    prisma.$queryRaw<{ n: number }[]>`
      select count(distinct meta->>'guest')::int as n from "ActivityLog"
      where "userId" is null and type = 'song_created' and "createdAt" >= ${d30}`,
    prisma.user.count({ where: { ...notAdmin, createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { ...notAdmin, createdAt: { gte: d30 }, songs: { some: {} } } }),
    prisma.$queryRaw<{ n: number }[]>`
      select count(distinct "userId")::int as n from "ActivityLog"
      where type = 'sub_started' and "createdAt" >= ${d30}
        and not ("userId" = any(${adminIds}::text[]))`,
    prisma.$queryRaw<{ n: number }[]>`
      select count(distinct "userId")::int as n from "ActivityLog"
      where "createdAt" >= ${d30} and not ("userId" = any(${adminIds}::text[]))
        and meta->>'status' = 'active'
        and (type = 'sub_started' or (type = 'sub_changed' and meta->>'event' is null))`,

    prisma.$queryRaw<{ n: number }[]>`
      select count(distinct meta->>'guest')::int as n from "ActivityLog"
      where "userId" is null and meta->>'guest' is not null and meta->>'guest' <> 'unknown'
        and type <> 'ai_call' and "createdAt" >= ${d30}`,
    prisma.activityLog.count({ where: { userId: null, type: "song_created", createdAt: { gte: d30 } } }),
    prisma.$queryRaw<{ n: number }[]>`
      select count(distinct meta->>'guest')::int as n from "ActivityLog"
      where "userId" is null and meta->>'guest' is not null and meta->>'guest' <> 'unknown'
        and type in ('style_changed', 'ai_styled', 'bg_generated') and "createdAt" >= ${d30}`,
    prisma.activityLog.count({
      where: { userId: { not: null, notIn: adminIds }, type: "song_created", createdAt: { gte: d30 } },
    }),
    prisma.$queryRaw<{ b: Date; visitors: number; songs: number }[]>`
      select date_trunc('week', "createdAt") as b,
             count(distinct meta->>'guest')::int as visitors,
             count(*) filter (where type = 'song_created')::int as songs
      from "ActivityLog"
      where "userId" is null and meta->>'guest' is not null and type not in ('ai_call', 'job_run')
        and "createdAt" >= ${since12w}
      group by 1`,

    prisma.$queryRaw<{ type: string; kind: string | null; guest: boolean; n: number }[]>`
      select type, meta->>'kind' as kind, ("userId" is null) as guest, count(*)::int as n
      from "ActivityLog"
      where type in ('ai_call', 'ai_styled', 'bg_generated') and "createdAt" >= ${d30}
      group by 1, 2, 3`,
    prisma.$queryRaw<Bucket[]>`
      select date_trunc('day', "createdAt") as b, count(*)::int as n
      from "ActivityLog"
      where type in ('ai_call', 'ai_styled', 'bg_generated') and "createdAt" >= ${d30}
      group by 1`,
    prisma.$queryRaw<{ at: Date | null }[]>`
      select min("createdAt") as at from "ActivityLog" where type = 'ai_call'`,

    prisma.$queryRaw<Bucket[]>`
      select date_trunc('week', "createdAt") as b, count(*)::int as n
      from "User" where "createdAt" >= ${since12w} and not (id = any(${adminIds}::text[]))
      group by 1`,
    prisma.$queryRaw<Bucket[]>`
      select date_trunc('week', "createdAt") as b, count(*)::int as n
      from "Song" where "createdAt" >= ${since12w} and not ("userId" = any(${adminIds}::text[]))
      group by 1`,
    prisma.$queryRaw<Bucket[]>`
      select date_trunc('week', "createdAt") as b, count(*)::int as n
      from "ActivityLog"
      where type = 'sub_started' and "createdAt" >= ${since12w}
        and not ("userId" = any(${adminIds}::text[]))
      group by 1`,
  ]);

  // What a run would send right now. Its own try: a fault in the email rules
  // must not take the dashboard down with it.
  let dueNow: number | null = null;
  try {
    dueNow = (await planAutoDrip(now)).length;
  } catch {
    dueNow = null;
  }

  // Where people were. Only rows that carry a country, which is every action
  // a person takes themselves from 16 Nov 2026 on.
  const countryRows = await prisma.$queryRaw<{ code: string; accounts: number; visitors: number }[]>`
    select meta->>'country' as code,
           count(distinct "userId") filter (
             where "userId" is not null and not ("userId" = any(${adminIds}::text[]))
           )::int as accounts,
           count(distinct meta->>'guest') filter (
             where "userId" is null and meta->>'guest' is not null and meta->>'guest' <> 'unknown'
           )::int as visitors
    from "ActivityLog"
    where "createdAt" >= ${d30} and meta->>'country' is not null
    group by 1
    order by 2 desc, 3 desc
    limit 12`;

  const runMeta = (lastRunRow?.meta ?? null) as Record<string, unknown> | null;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);

  const kinds = Object.fromEntries(AI_KINDS.map((k) => [k, { guests: 0, accounts: 0 }])) as AdminInsights["ai"]["kinds"];
  for (const r of aiRows) {
    const kind: AiKind | null =
      r.type === "ai_styled" ? "style"
      : r.type === "bg_generated" ? "picture"
      : r.kind === "search" || r.kind === "paste" || r.kind === "photo" ? r.kind
      : null;
    if (!kind) continue;
    kinds[kind][r.guest ? "guests" : "accounts"] += r.n;
  }
  const estimateUsd = AI_KINDS.reduce((sum, k) => sum + (kinds[k].guests + kinds[k].accounts) * AI_COST_USD[k], 0);

  const guestWeekly = new Map(guestWeeklyRows.map((r) => [dayKey(new Date(r.b)), r]));

  return {
    attention: {
      trialsEnding: trialsEnding.map((u) => ({ id: u.id, name: u.name, email: u.email, plan: u.plan, at: u.stripeCurrentPeriodEnd!.toISOString() })),
      paymentProblems: paymentProblems.map((u) => ({ id: u.id, name: u.name, email: u.email, plan: u.plan, status: u.stripeSubscriptionStatus ?? "" })),
      cancelling: cancelling.map((u) => ({ id: u.id, name: u.name, email: u.email, plan: u.plan, at: u.stripeCancelAt!.toISOString() })),
      atLimit: atLimitRows.map((u) => ({ id: u.id, name: u.name, email: u.email, songs: u.songs, at: new Date(u.at).toISOString() })),
    },
    emailJob: {
      lastRun: lastRunRow
        ? {
            at: lastRunRow.createdAt.toISOString(),
            due: num(runMeta?.due), sent: num(runMeta?.sent), failed: num(runMeta?.failed), skipped: num(runMeta?.skipped),
            dryRun: runMeta?.dryRun === true,
          }
        : null,
      lastAutoEmailAt: lastAutoRows[0]?.at ? new Date(lastAutoRows[0].at).toISOString() : null,
      sent7d: {
        auto: sent7Rows.find((r) => r.auto)?.n ?? 0,
        manual: sent7Rows.find((r) => !r.auto)?.n ?? 0,
      },
      dueNow,
      daily: days14.map((day, i) => ({ day, n: fill(days14, autoDailyRows)[i] })),
    },
    funnel: {
      days: 30,
      guestsWithSong: guestsWithSongRows[0]?.n ?? 0,
      signups,
      signupsWithSong,
      trials: trialRows[0]?.n ?? 0,
      paid: paidRows[0]?.n ?? 0,
    },
    guests: {
      days: 30,
      visitors: guestVisitorRows[0]?.n ?? 0,
      songs: guestSongRows,
      styled: guestStyledRows[0]?.n ?? 0,
      accountSongs: accountSongRows,
      weekly: weekKeys.map((week) => ({
        week,
        visitors: guestWeekly.get(week)?.visitors ?? 0,
        songs: guestWeekly.get(week)?.songs ?? 0,
      })),
    },
    ai: {
      days: 30,
      kinds,
      daily: days30.map((day, i) => ({ day, n: fill(days30, aiDailyRows)[i] })),
      estimateUsd: Math.round(estimateUsd * 100) / 100,
      countedSince: aiSinceRows[0]?.at ? new Date(aiSinceRows[0].at).toISOString() : null,
    },
    countries: {
      days: 30,
      rows: countryRows.filter((r) => r.accounts + r.visitors > 0),
    },
    trends: {
      weeks: weekKeys,
      signups: fill(weekKeys, signupWeekly),
      songs: fill(weekKeys, songWeekly),
      guestSongs: weekKeys.map((w) => guestWeekly.get(w)?.songs ?? 0),
      trials: fill(weekKeys, trialWeekly),
    },
  };
}
