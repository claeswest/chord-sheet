// Reading a Stripe subscription's dates.
//
// Small on purpose. This is here because the derivation below was wrong once,
// in ChordSheetMaker, and the correction then had to be carried across to
// RecipeBookMaker by hand — which is the actual argument for sharing code, as
// opposed to two files merely looking alike.
//
// What is deliberately NOT here: resolving a user's plan. The two apps answer
// that differently on purpose — ChordSheetMaker requires a subscription id and
// treats a trial as full access explicitly; RecipeBookMaker treats a "canceled"
// status as free and tolerates a missing period end. Unifying those would be a
// change of behaviour in at least one product, not a refactor, and it is not
// this module's decision to make.
//
// Also not here: field names. Each app maps these values onto its own columns,
// so nothing in core has to know a schema.

/**
 * Only the parts of a Stripe subscription these functions read.
 *
 * Structural rather than the SDK's type, so core doesn't take a dependency on
 * `stripe` for two date lookups — and so a test can pass a plain object.
 */
export type SubscriptionLike = {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  items: { data: Array<{ current_period_end: number }> };
};

/**
 * When a subscription is set to end, or null if it isn't.
 *
 * A pending cancellation arrives in two shapes depending on how it was made:
 * an explicit `cancel_at` timestamp, which is what the customer portal sets,
 * or `cancel_at_period_end` with the date living on the item. Either way the
 * status stays trialing or active until the day arrives, so this is the only
 * signal that someone has left — reading status alone finds out a month late.
 */
export function pendingCancellationAt(sub: SubscriptionLike): Date | null {
  if (sub.cancel_at) return new Date(sub.cancel_at * 1000);
  if (sub.cancel_at_period_end) {
    return new Date(sub.items.data[0].current_period_end * 1000);
  }
  return null;
}

/** When the paid-up period runs out — the renewal date, or the trial's end. */
export function currentPeriodEnd(sub: SubscriptionLike): Date {
  return new Date(sub.items.data[0].current_period_end * 1000);
}

/**
 * Whether a stored cancellation date is still in the future.
 *
 * The distinction that matters: a date in the future means leaving, a date in
 * the past means left. Testing the field for presence alone marks a churned
 * account as permanently "about to cancel", which is how it read before.
 */
export function cancellationPending(cancelAt: Date | string | null | undefined): boolean {
  if (!cancelAt) return false;
  return new Date(cancelAt).getTime() > Date.now();
}
