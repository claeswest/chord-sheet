// The daily job behind the first emails of the drip: who is owed one today,
// and sending it.
//
// What may go to whom, and in which order, is decided in marketingRules.ts.
// How an email is built and sent is sendMarketingEmail() — the same function
// the admin page calls, so a send made here carries the same unsubscribe link,
// the same copy to the founder, and obeys the same opt-out. This file only
// finds the people.
//
// Idempotent through the activity log, like RecipeBookMaker's trial emails:
// every send records its template, and a template someone already has is never
// chosen again. The cooldown then keeps a second run on the same day — a
// retried cron, a manual poke, two overlapping deploys — from sending the
// *next* step early.

import { prisma } from "./prisma";
import { sendMarketingEmail, type SendResult } from "./marketing";
import {
  AUTO_DRIP_COOLDOWN_MS,
  AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS,
  AUTO_DRIP_MIN_ACCOUNT_AGE_HOURS,
  nextAutoTemplate,
  type MarketingTemplate,
} from "./marketingRules";

/**
 * Most emails one run will send. The daily number is a handful; this exists
 * for the day something is wrong — a bad migration, a bug in the rules — so
 * that the damage is forty emails and not the whole user table. Anyone over
 * the limit is simply picked up by the next run.
 */
const MAX_PER_RUN = 40;

/** Resend allows two requests a second; stay well clear of it. */
const PAUSE_BETWEEN_SENDS_MS = 600;

export type DripItem = { userId: string; template: MarketingTemplate };

/** Everyone the job owes an email right now, oldest account first. */
export async function planAutoDrip(now = Date.now()): Promise<DripItem[]> {
  const users = await prisma.user.findMany({
    where: {
      marketingOptOut: false,
      createdAt: {
        gte: new Date(now - AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS * 86_400_000),
        lte: new Date(now - AUTO_DRIP_MIN_ACCOUNT_AGE_HOURS * 3_600_000),
      },
      OR: [
        { lastMarketingEmailAt: null },
        { lastMarketingEmailAt: { lte: new Date(now - AUTO_DRIP_COOLDOWN_MS) } },
      ],
    },
    select: {
      id: true,
      plan: true,
      stripeCancelAt: true,
      stripeCustomerId: true,
      activities: { where: { type: "marketing_email" }, select: { meta: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const plan: DripItem[] = [];
  for (const u of users) {
    const sent = new Set<string>();
    for (const a of u.activities) {
      const t = (a.meta as Record<string, unknown> | null)?.template;
      // A row without a template still counts as "has been emailed".
      sent.add(typeof t === "string" ? t : "unknown");
    }
    const template = nextAutoTemplate(sent, {
      plan: u.plan,
      cancelAt: u.stripeCancelAt,
      hasSubscribedBefore: !!u.stripeCustomerId,
    });
    if (template) plan.push({ userId: u.id, template });
  }
  return plan;
}

export type DripRun = {
  dryRun: boolean;
  /** How many people were owed an email. */
  due: number;
  /** Owed, but over this run's limit — the next run takes them. */
  deferred: number;
  sent: number;
  skipped: number;
  failed: number;
  /** Ids and templates only — this ends up in logs. */
  items: (DripItem & { result: SendResult | "would_send" })[];
};

/** Sends everything owed today. Safe to run more than once. */
export async function runAutoDrip({ dryRun }: { dryRun: boolean }): Promise<DripRun> {
  const due = await planAutoDrip();
  const batch = due.slice(0, MAX_PER_RUN);
  const run: DripRun = {
    dryRun,
    due: due.length,
    deferred: due.length - batch.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const item of batch) {
    if (dryRun) {
      run.items.push({ ...item, result: "would_send" });
      continue;
    }
    // Sequential rather than Promise.all: Resend rate-limits, and a burst of
    // 429s would be indistinguishable from a bad address.
    const result = await sendMarketingEmail(item.userId, item.template, { auto: true });
    run.items.push({ ...item, result });
    if (result === "sent") run.sent++;
    else if (result === "failed") run.failed++;
    else run.skipped++;
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_SENDS_MS));
  }

  return run;
}
