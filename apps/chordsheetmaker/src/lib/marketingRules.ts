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
 * The date matters, not merely its presence: `stripeCancelAt` is never cleared
 * when the subscription finally lapses, so a churned user keeps a past date on
 * their row forever. Anything testing `if (cancelAt)` will call them "leaving"
 * for the rest of time.
 */
export function cancellationPending(cancelAt: Date | string | null | undefined): boolean {
  if (!cancelAt) return false;
  return new Date(cancelAt).getTime() > Date.now();
}

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
