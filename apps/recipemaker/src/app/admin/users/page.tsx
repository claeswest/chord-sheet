import Link from "next/link";
import { findUsers } from "@/lib/adminData";
import { cancellationPending } from "@clavos/core/billing";

// Search and paging live in the URL rather than in client state: /admin/users
// ?q=claes&page=2 can be sent to yourself, survives a reload, and needs no
// JavaScript. The expandable row is a <details>, for the same reason.

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function billingLabel(u: {
  plan: string;
  status: string | null;
  cancelAt: Date | null;
  periodEnd: Date | null;
}): string {
  if (u.plan === "free") return "Free";
  if (cancellationPending(u.cancelAt)) return `Leaving ${day(u.cancelAt!)}`;
  if (u.status === "trialing") return `Trial to ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  if (u.status === "active") return `Paying · renews ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  return u.status ?? u.plan;
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page } = await searchParams;
  const data = await findUsers(q, Number(page) || 1);

  const link = (p: number) =>
    `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          People <span className="text-ink-faint">{data.total}</span>
        </h2>

        {/* A plain GET form: no client component, and the result is a URL. */}
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="w-56 rounded-full border border-rule px-4 py-1.5 text-sm focus:border-ink focus:outline-none"
          />
          <button className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold hover:bg-paper-sunken">
            Search
          </button>
          {q && (
            <Link
              href="/admin/users"
              className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <ul className="mt-4 divide-y divide-rule/60">
        {data.users.map((u) => (
          <li key={u.id} className="py-3">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 text-sm">
                <span className="font-medium">{u.name || "—"}</span>
                <span className="text-ink-faint">{u.email}</span>
                <span className={u.recipes === 0 ? "text-ink-faint" : "text-ink"}>
                  {u.recipes} recipe{u.recipes === 1 ? "" : "s"}
                </span>
                <span className="ml-auto text-ink-muted">{billingLabel(u)}</span>
              </summary>

              <div className="mt-2 pl-4 text-sm text-ink-muted">
                <p>Joined {day(u.createdAt)}</p>
                {u.latestRecipes.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5">
                    {u.latestRecipes.map((r) => (
                      <li key={r.id}>{r.title || "Untitled recipe"}</li>
                    ))}
                  </ul>
                ) : (
                  // The most useful thing this page can tell you: someone
                  // arrived and never wrote anything.
                  <p className="mt-1 text-ink-faint">Signed up but never wrote a recipe.</p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {data.users.length === 0 && (
        <p className="mt-4 text-sm text-ink-faint">
          {q ? `Nobody matches “${q}”.` : "Nobody has signed up yet."}
        </p>
      )}

      {data.pages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {data.page > 1 ? (
            <Link href={link(data.page - 1)} className="text-ink-muted hover:text-ink">
              ← Previous
            </Link>
          ) : (
            <span className="text-ink-faint">← Previous</span>
          )}
          <span className="text-ink-faint">
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages ? (
            <Link href={link(data.page + 1)} className="text-ink-muted hover:text-ink">
              Next →
            </Link>
          ) : (
            <span className="text-ink-faint">Next →</span>
          )}
        </div>
      )}
    </>
  );
}
