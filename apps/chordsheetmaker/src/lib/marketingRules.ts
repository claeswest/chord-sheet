// Who may receive which marketing email.
//
// Pure logic, deliberately free of prisma/crypto imports so the admin UI, the
// sender in lib/marketing.ts, and any future automated drip all share one rule
// set. Before this existed the rules lived only in the admin page, which meant
// the sender itself would happily mail anyone anything.

export const MARKETING_TEMPLATES = [
  "upgrade_nudge", "welcome_tips", "winback", "ai_magic", "band_share", "photo_rescue", "feedback_ask",
] as const;
export type MarketingTemplate = (typeof MARKETING_TEMPLATES)[number];

/** Minimum gap between marketing emails to the same user. */
export const EMAIL_COOLDOWN_DAYS = 3;

/** Suggested drip order. Win-back sits outside it — situational, not a step. */
export const EMAIL_SEQUENCE: MarketingTemplate[] = [
  "welcome_tips", "ai_magic", "photo_rescue", "band_share", "upgrade_nudge", "feedback_ask",
];

/** What we need to know about a recipient to decide what's appropriate. */
export type Audience = {
  plan: string | null;
  /** Set the moment a cancellation is scheduled — status stays trialing/active until it passes. */
  cancelAt: Date | string | null;
  /** Has reached Stripe checkout at least once, so the 7-day trial is spent. */
  hasSubscribedBefore: boolean;
};

/**
 * A scheduled cancellation that hasn't taken effect yet.
 *
 * Re-exported rather than redefined: this is the third place the same rule was
 * written, and it now lives in @clavos/core/billing.
 *
 * The date matters, not merely its presence. This once said `stripeCancelAt`
 * is never cleared when a subscription lapses — that was true when it was
 * written and the webhook now clears it on `customer.subscription.deleted`.
 * The rule still stands for a different reason: a cancellation scheduled for
 * next March is not the same as one that already happened.
 */
import { cancellationPending } from "@clavos/core/billing";
export { cancellationPending };

/**
 * Cancelled but still inside the notice period: `plan` still reads "monthly"
 * and the status is still trialing/active, so plan alone can't tell you this
 * person is on their way out. Once the date passes they're an ordinary free
 * user again and the normal rules apply.
 */
export function isLeaving(a: Audience): boolean {
  return cancellationPending(a.cancelAt);
}

/** Paying and staying — the only group an upgrade pitch is wrong for. */
export function isPaying(a: Audience): boolean {
  return !!a.plan && a.plan !== "free" && !isLeaving(a);
}

/**
 * Why this template must not go to this person, or null if it's fine.
 * The string is shown in the admin UI, so keep it readable.
 */
export function templateBlockReason(t: MarketingTemplate, a: Audience): string | null {
  const leaving = isLeaving(a);

  // The upgrade pitch makes no sense for someone already paying and staying —
  // but it is exactly right for someone on their way out, which is when the
  // old plan-only check used to hide it.
  if (t === "upgrade_nudge" && isPaying(a)) return "already on Pro";

  // Pitches share links as a reason to buy Pro — they have Pro right now and
  // are leaving it. Reads as not knowing who they are.
  if (t === "band_share" && leaving) return "has Pro and is cancelling";

  // "It's been a while!" — they still have an active account and access.
  if (t === "winback" && leaving) return "still active until access ends";

  return null;
}

export function allowedTemplates(a: Audience): MarketingTemplate[] {
  return MARKETING_TEMPLATES.filter((t) => templateBlockReason(t, a) === null);
}

/**
 * First unsent step in the sequence. Someone cancelling gets asked why first —
 * that window is the best feedback and the best save opportunity you get, and
 * the webhook's own admin alert already says as much.
 */
export function suggestNextTemplate(sent: Set<string>, a: Audience): MarketingTemplate {
  const allowed = new Set(allowedTemplates(a));
  const pick = (order: MarketingTemplate[]) =>
    order.find((t) => allowed.has(t) && !sent.has(t));

  if (isLeaving(a)) {
    const forLeaving = pick(["feedback_ask", "upgrade_nudge", ...EMAIL_SEQUENCE]);
    if (forLeaving) return forLeaving;
  }
  return pick(EMAIL_SEQUENCE) ?? "winback";
}

// ── The automatic part of the drip ──────────────────────────────────────────
//
// The first steps of the sequence go out by themselves, from a daily job
// (lib/autoDrip.ts, /api/cron/drip). They were being sent by hand, which in
// practice meant late or not at all. Everything after them stays manual: an
// upgrade pitch or a request for feedback is worth a person deciding on.

/** How many steps of EMAIL_SEQUENCE send themselves. */
export const AUTO_DRIP_STEPS = 3;
export const AUTO_DRIP_TEMPLATES: MarketingTemplate[] = EMAIL_SEQUENCE.slice(0, AUTO_DRIP_STEPS);

/**
 * Only accounts younger than this are picked up. The whole automatic run takes
 * about a week, so this is slack, not a schedule — its real job is keeping the
 * job away from old accounts: "Welcome!" three months after signing up is
 * worse than no email. Those stay with the founder.
 */
export const AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS = 30;

/** Not on top of the sign-in email that created the account. */
export const AUTO_DRIP_MIN_ACCOUNT_AGE_HOURS = 1;

/**
 * The cooldown as the daily job sees it: two hours short of the real one.
 *
 * Vercel Cron on the Hobby plan fires anywhere inside its hour. Measured
 * against a full 72 hours, a run at 14:40 followed three days later by one at
 * 14:05 finds the cooldown 35 minutes from over and waits a whole extra day.
 * The same slack, for the same reason, as RecipeBookMaker's trial emails.
 */
export const AUTO_DRIP_COOLDOWN_MS = EMAIL_COOLDOWN_DAYS * 86_400_000 - 2 * 3_600_000;

/**
 * The email the daily job owes this person next, or null when it owes none.
 *
 * `sent` is every marketing template they have had, by hand or by the job, so
 * the two never duplicate each other.
 */
export function nextAutoTemplate(sent: Set<string>, a: Audience): MarketingTemplate | null {
  // On their way out: that conversation belongs to a person. The admin page
  // already puts "ask why" first for them, and a cheerful tip email arriving
  // in the same week reads as a machine that hasn't noticed.
  if (isLeaving(a)) return null;

  const allowed = new Set(allowedTemplates(a));
  return (
    AUTO_DRIP_TEMPLATES.find((t) => {
      if (!allowed.has(t) || sent.has(t)) return false;
      // A welcome is only a welcome when it comes first.
      if (t === "welcome_tips" && sent.size > 0) return false;
      return true;
    }) ?? null
  );
}
