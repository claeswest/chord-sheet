// Status-aware plan badge shared by the admin dashboard, the users list and
// the user page, so all reflect real Stripe status (trialing / active /
// past_due) rather than a plain plan name. Hovering a trial badge shows when
// it converts.

import { cancellationPending } from "@/lib/marketingRules";
import { BADGE, TONE, fmtDate, type Tone } from "./ui";

// Used to live here; other admin files still import it from this module.
export { relativeTime } from "./ui";

export default function PlanBadge({
  plan,
  status,
  periodEnd,
  cancelAt,
}: {
  plan: string | null;
  status: string | null;
  periodEnd?: string | null;
  /** Set when a cancellation is scheduled — status stays trialing/active until then. */
  cancelAt?: string | null;
}) {
  let label = plan ?? "free";
  let tone: Tone = "quiet";
  let title: string | undefined;

  // A pending cancellation outranks the status: someone still "active" who has
  // already left is the one thing you want to spot in the list. Only while it
  // is still pending, though — stripeCancelAt is never cleared once the
  // subscription lapses, so testing for its presence alone would leave churned
  // accounts flagged "ends <date>" forever, hiding what they actually are now.
  if (cancellationPending(cancelAt)) {
    return (
      <span title={`Cancelled — access ends ${fmtDate(cancelAt!)}`} className={`${BADGE} ${TONE.bad}`}>
        {plan} · ends {fmtDate(cancelAt!)}
      </span>
    );
  }

  if (status === "trialing") {
    label = `trial · ${plan}`;
    tone = "warn";
    title = periodEnd ? `Trial converts ${fmtDate(periodEnd)}` : "On trial";
  } else if ((plan === "monthly" || plan === "yearly") && status === "active") {
    tone = "good";
    title = periodEnd ? `Renews ${fmtDate(periodEnd)}` : "Active subscription";
  } else if (plan === "lifetime") {
    tone = "info";
  } else if (status === "past_due" || status === "unpaid" || status === "canceled") {
    label = `${plan} · ${status.replace("_", " ")}`;
    tone = "bad";
  }

  // Churn that already completed: they read as an ordinary free user now, which
  // is correct — but keep the fact on hover rather than losing it. Rows written
  // before the deleted-handler cleared this field still carry the old date.
  if (cancelAt && !status) {
    title = `Cancelled — access ended ${fmtDate(cancelAt)}`;
  }

  return (
    <span title={title} className={`${BADGE} ${TONE[tone]}`}>
      {label}
    </span>
  );
}
