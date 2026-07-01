// Status-aware plan badge shared by the admin dashboard and users list, so both
// reflect real Stripe status (trialing / active / past_due) rather than a plain
// plan name. Hovering a trial badge shows when it converts.

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlanBadge({
  plan,
  status,
  periodEnd,
}: {
  plan: string | null;
  status: string | null;
  periodEnd?: string | null;
}) {
  let label = plan ?? "free";
  let cls = "bg-zinc-800 text-zinc-400";
  let title: string | undefined;

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

  return (
    <span
      title={title}
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}
