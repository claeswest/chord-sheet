import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { activityTotals, recentActivity } from "@/lib/adminData";
import { eventDetail, eventLabel, when } from "@/lib/adminFormat";

// What the log already knows. Nothing new is recorded to build this page —
// every row here was written by a feature doing its job.

export default async function AdminActivity({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();

  const { type } = await searchParams;
  const [rows, totals] = await Promise.all([recentActivity(100, type), activityTotals()]);

  return (
    <>
      <h2 className="font-display mt-8 text-xl font-bold">What gets used</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* The counts double as the filter — the thing you want after seeing
            "Imported a recipe 41" is those 41 rows. */}
        <Link
          href="/admin/activity"
          className={`rounded-full border px-3 py-1 text-sm ${!type ? "border-ink bg-ink text-paper-raised" : "border-rule text-ink-muted hover:bg-paper-sunken"}`}
        >
          All
        </Link>
        {totals.map((t) => (
          <Link
            key={t.type}
            href={`/admin/activity?type=${encodeURIComponent(t.type)}`}
            className={`rounded-full border px-3 py-1 text-sm ${type === t.type ? "border-ink bg-ink text-paper-raised" : "border-rule text-ink-muted hover:bg-paper-sunken"}`}
          >
            {eventLabel(t.type)} <span className={type === t.type ? "font-semibold" : "font-semibold text-ink"}>{t.count}</span>
          </Link>
        ))}
        {totals.length === 0 && <span className="text-sm text-ink-faint">Nothing logged yet.</span>}
      </div>

      <h2 className="font-display mt-10 text-xl font-bold">Latest</h2>
      <ul className="mt-3 divide-y divide-rule/60">
        {rows.map((r) => {
          const detail = eventDetail(r.type, r.meta);
          return (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-ink-faint">{when(r.createdAt)}</span>
              <span className="font-medium">{eventLabel(r.type)}</span>
              {detail && <span className="text-ink-muted">{detail}</span>}
              {r.userId ? (
                <Link
                  href={`/admin/users/${r.userId}`}
                  className="ml-auto text-xs text-ink-faint hover:text-ink hover:underline"
                >
                  {r.email}
                </Link>
              ) : (
                <span className="ml-auto text-xs text-ink-faint">signed out</span>
              )}
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && <p className="mt-4 text-sm text-ink-faint">Nothing logged yet.</p>}
    </>
  );
}
