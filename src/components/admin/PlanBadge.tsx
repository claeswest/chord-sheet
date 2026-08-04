// Status-aware plan badge shared by the admin dashboard and users list, so both
// reflect real Stripe status (trialing / active / past_due) rather than a plain
// plan name. Hovering a trial badge shows when it converts.

import { cancellationPending } from "@/lib/marketingRules";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "4 min ago" / "3h ago" / "5d ago" / "Jun 12" — for the last-active column. */
export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) {
    const m = Math.floor(ms / 60_000);
    return m < 1 ? "<1 min ago" : `${m} min ago`;
  }
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

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
  let cls = "bg-zinc-800 text-zinc-400";
  let title: string | undefined;

  // A pending cancellation outranks the status: someone still "active" who has
  // already left is the one thing you want to spot in the list. Only while it
  // is still pending, though — stripeCancelAt is never cleared once the
  // subscription lapses, so testing for its presence alone would leave churned
  // accounts flagged "⚠ ends <date>" forever, hiding what they actually are now.
  if (cancellationPending(cancelAt)) {
    return (
      <span
        title={`Cancelled — access ends ${formatDate(cancelAt!)}`}
        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-red-900/40 text-red-300"
      >
        ⚠ {plan} · ends {formatDate(cancelAt!)}
      </span>
    );
  }

  if (status === "trialing") {
    label = `trial · ${plan}`;
    cls = "bg-amber-900/40 text-amber-300";
    title = periodEnd ? `Trial converts ${formatDate(periodEnd)}` : "On trial";
  } else if ((plan === "monthly" || plan === "yearly") && status === "active") {
    cls = "bg-emerald-900/40 text-emerald-300";
    title = periodEnd ? `Renews ${formatDate(periodEnd)}` : "Active subscription";
  } else if (plan === "lifetime") {
    cls = "bg-indigo-900/40 text-indigo-300";
  } else if (status === "past_due" || status === "canceled") {
    label = `${plan} · ${status}`;
    cls = "bg-red-900/40 text-red-300";
  }

  // Churn that already completed: they read as an ordinary free user now, which
  // is correct — but keep the fact on hover rather than losing it. Rows written
  // before the deleted-handler cleared this field still carry the old date.
  if (cancelAt && !status) {
    title = `Cancelled — access ended ${formatDate(cancelAt)}`;
  }

  return (
    <span
      title={title}
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}
