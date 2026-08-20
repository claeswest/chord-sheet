// Sending the trial emails: who is owed one today, and putting it in the post.
//
// A trial is seven days long and, until now, completely silent — someone got
// no help using the thing and then got charged without warning. Both are
// fixable with two emails. What they say lives in trialEmails.ts; this file
// only decides who gets them and talks to Resend.
//
// The anchor is stripeCurrentPeriodEnd, which for a trialing subscription is
// the day the first payment lands. Everything counts backwards from it, so a
// trial Stripe extends or shortens moves its emails with it. Counting forwards
// from signup would drift the moment anything unusual happened.
//
// Sending is idempotent through the activity log: each email writes its own
// event type and anyone who already has it is skipped. That is what makes the
// job safe to run twice, which it will be — a retried cron, a manual poke, two
// overlapping deploys.

import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { adminRecipients } from "./notify";
import { cancellationPending } from "@clavos/core/billing";
import { renderEmail } from "@clavos/core/email-template";
import { unsubscribeToken } from "@clavos/core/unsubscribe";
import {
  BASE_URL,
  BRAND,
  TRIAL_EMAILS,
  daysBeforeCharge,
  eventType,
  isTransactional,
  trialEmailContent,
  type Recipient,
  type TrialEmail,
} from "./trialEmails";

const DAY = 86_400_000;

/** Everyone due a given email today. */
async function due(t: TrialEmail): Promise<Recipient[]> {
  const [fromDays, toDays] = daysBeforeCharge(t);
  const now = Date.now();

  const rows = await prisma.user.findMany({
    where: {
      stripeSubscriptionStatus: "trialing",
      stripeCurrentPeriodEnd: {
        gte: new Date(now + fromDays * DAY),
        lt: new Date(now + toDays * DAY),
      },
      ...(isTransactional(t) ? {} : { marketingOptOut: false }),
      // Already sent, in any earlier run. This is the idempotency.
      NOT: { activities: { some: { type: eventType(t) } } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeCurrentPeriodEnd: true,
      stripeCancelAt: true,
      _count: { select: { recipes: true } },
    },
    take: 200,
  });

  return rows
    // Someone who has already cancelled knows exactly when it ends; telling
    // them again reads as a machine that hasn't noticed. Tips are moot too.
    .filter((u) => !cancellationPending(u.stripeCancelAt))
    .filter((u) => u.email && u.stripeCurrentPeriodEnd)
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      recipes: u._count.recipes,
      trialEndsAt: u.stripeCurrentPeriodEnd!,
    }));
}

async function sendOne(t: TrialEmail, u: Recipient): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const unsubscribeUrl = isTransactional(t)
    ? undefined
    : `${BASE_URL}/unsubscribe?u=${u.id}&t=${unsubscribeToken(u.id)}`;

  const { subject, html, text } = renderEmail(BRAND, {
    ...trialEmailContent(t, u),
    unsubscribeUrl,
  });
  const admins = adminRecipients();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "RecipeBookMaker <onboarding@resend.dev>",
      to: u.email,
      ...(admins.length > 0 ? { bcc: admins, reply_to: admins[0] } : {}),
      ...(unsubscribeUrl
        ? {
            // Gmail and Yahoo require one-click unsubscribe on bulk mail
            // (RFC 8058). Absent on the transactional one, correctly: it
            // isn't a list, and offering to unsubscribe from a billing
            // notice would be a promise we can't keep.
            headers: {
              "List-Unsubscribe": `<${BASE_URL}/api/unsubscribe?u=${u.id}&t=${unsubscribeToken(u.id)}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) return false;

  // Written only after a successful send, so a Resend outage means "try again
  // tomorrow" rather than "this person silently never hears from us".
  await logActivity(eventType(t), u.id, { trialEndsAt: u.trialEndsAt.toISOString() });
  // Keeps an admin marketing nudge from landing on top of a trial email. The
  // trial sequence itself never reads this field — a seven-day cooldown inside
  // a seven-day trial would cancel the second email.
  await prisma.user.update({
    where: { id: u.id },
    data: { lastMarketingEmailAt: new Date() },
  });
  return true;
}

export type RunResult = { template: TrialEmail; due: number; sent: number; failed: number };

/** Sends everything owed today. Safe to run more than once. */
export async function runTrialEmails(): Promise<RunResult[]> {
  const results: RunResult[] = [];

  for (const t of TRIAL_EMAILS) {
    const people = await due(t);
    let sent = 0;
    let failed = 0;
    // Sequential rather than Promise.all: Resend rate-limits, and a burst of
    // 429s would be indistinguishable from a bad address.
    for (const u of people) {
      if (await sendOne(t, u)) sent++;
      else failed++;
    }
    results.push({ template: t, due: people.length, sent, failed });
  }

  return results;
}
