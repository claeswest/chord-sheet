import { activityTotals, recentActivity } from "@/lib/adminData";

// What the log already knows. Nothing new is recorded to build this page —
// every row here was written by a feature doing its job.

const when = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Reads better than the raw event name, and says which ones matter. */
const LABELS: Record<string, string> = {
  account_created: "Signed up",
  login: "Signed in",
  recipe_imported: "Imported a recipe",
  recipe_reviewed: "Ran the checker",
  recipe_styled: "Styled a recipe",
  recipe_shared: "Shared a link",
  recipe_unshared: "Withdrew a link",
  recipe_image_generated: "Drew a picture",
  recipe_image_saved: "Saved a picture",
  sub_started: "Subscribed",
  sub_changed: "Subscription changed",
  sub_ended: "Subscription ended",
};

/** The one-line summary worth showing beside an event. */
function summarise(type: string, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  if (type === "recipe_imported") {
    return [m.from === "photo" ? "from a photo" : "from text", m.title].filter(Boolean).join(" · ");
  }
  if (type === "recipe_reviewed") {
    const n = typeof m.found === "number" ? m.found : null;
    return n === null ? "" : n === 0 ? "nothing to fix" : `${n} suggestion${n === 1 ? "" : "s"}`;
  }
  if (type === "recipe_image_generated") return m.kind === "step" ? "a step" : "the dish";
  if (type.startsWith("sub_")) {
    return [m.event, m.plan, m.status].filter(Boolean).join(" · ");
  }
  return "";
}

export default async function AdminActivity() {
  const [rows, totals] = await Promise.all([recentActivity(), activityTotals()]);

  return (
    <>
      <h2 className="font-display mt-8 text-xl font-bold">What gets used</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {totals.map((t) => (
          <span
            key={t.type}
            className="rounded-full border border-rule px-3 py-1 text-sm text-ink-muted"
          >
            {LABELS[t.type] ?? t.type} <span className="font-semibold text-ink">{t.count}</span>
          </span>
        ))}
        {totals.length === 0 && <span className="text-sm text-ink-faint">Nothing logged yet.</span>}
      </div>

      <h2 className="font-display mt-10 text-xl font-bold">Latest</h2>
      <ul className="mt-3 divide-y divide-rule/60">
        {rows.map((r) => {
          const detail = summarise(r.type, r.meta);
          return (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-ink-faint">{when(r.createdAt)}</span>
              <span className="font-medium">{LABELS[r.type] ?? r.type}</span>
              {detail && <span className="text-ink-muted">{detail}</span>}
              <span className="ml-auto text-xs text-ink-faint">{r.email ?? "signed out"}</span>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && <p className="mt-4 text-sm text-ink-faint">Nothing logged yet.</p>}
    </>
  );
}
