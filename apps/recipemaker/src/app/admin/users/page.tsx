import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { findUsers, SHOWS, SORTS, type Show, type Sort } from "@/lib/adminData";
import { ago, billingLabel, day } from "@/lib/adminFormat";

// Search, filter, order and paging all live in the URL rather than in client
// state: /admin/users?show=trial&sort=active can be sent to yourself, survives
// a reload, and needs no JavaScript. Each row is a link to the person's own
// page, which is where their recipes and their timeline are.

const SHOW_LABELS: Record<Show, string> = {
  all: "Everyone",
  paying: "Paying",
  trial: "In trial",
  leaving: "Leaving",
  free: "Free",
  empty: "No recipes",
};

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; show?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const q = params.q ?? "";
  // Anything not on the list is the default, so a mistyped address still
  // shows a page rather than an error.
  const sort: Sort = SORTS.find((s) => s === params.sort) ?? "joined";
  const show: Show = SHOWS.find((s) => s === params.show) ?? "all";
  const data = await findUsers({ query: q, page: Number(params.page) || 1, sort, show });

  /** This page's address with some of it changed; defaults are left out. */
  const link = (change: { q?: string; page?: number; sort?: Sort; show?: Show }) => {
    const next = { q, sort, show, page: 1, ...change };
    const query = new URLSearchParams({
      ...(next.q ? { q: next.q } : {}),
      ...(next.show !== "all" ? { show: next.show } : {}),
      ...(next.sort !== "joined" ? { sort: next.sort } : {}),
      ...(next.page > 1 ? { page: String(next.page) } : {}),
    }).toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  /** A column heading that sorts by its column. All three sort newest or most first. */
  const sortHead = (label: string, by: Sort) =>
    sort === by ? (
      <span className="text-ink" aria-sort="descending">
        {label} ↓
      </span>
    ) : (
      <Link href={link({ sort: by })} className="hover:text-ink">
        {label}
      </Link>
    );

  return (
    <>
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          People <span className="text-ink-faint">{data.total}</span>
        </h2>

        {/* A plain GET form: no client component, and the result is a URL.
            The hidden fields carry the filter and the order through a search. */}
        <form className="flex gap-2">
          {show !== "all" && <input type="hidden" name="show" value={show} />}
          {sort !== "joined" && <input type="hidden" name="sort" value={sort} />}
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
              href={link({ q: "" })}
              className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SHOWS.map((s) => (
          <Link
            key={s}
            href={link({ show: s })}
            className={`rounded-full border px-3 py-1 text-sm ${show === s ? "border-ink bg-ink text-paper-raised" : "border-rule text-ink-muted hover:bg-paper-sunken"}`}
          >
            {SHOW_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs uppercase tracking-[0.14em] text-ink-faint">
              <th className="py-2 pr-4 font-normal">Person</th>
              <th className="py-2 pr-4 font-normal">{sortHead("Recipes", "recipes")}</th>
              <th className="py-2 pr-4 font-normal">{sortHead("Last active", "active")}</th>
              <th className="py-2 pr-4 font-normal">{sortHead("Joined", "joined")}</th>
              <th className="py-2 font-normal">Billing</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-b border-rule/60">
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                    {u.name || u.email}
                  </Link>
                  {u.name && <span className="block text-xs text-ink-faint">{u.email}</span>}
                </td>
                {/* Zero is the number worth seeing: someone who signed up and
                    never wrote anything is the product failing, not the person. */}
                <td className={`py-2 pr-4 ${u.recipes === 0 ? "text-ink-faint" : "text-ink"}`}>
                  {u.recipes}
                </td>
                <td className="py-2 pr-4 text-ink-muted">
                  {u.lastActive ? ago(u.lastActive) : "—"}
                </td>
                <td className="py-2 pr-4 text-ink-muted">{day(u.createdAt)}</td>
                <td className="py-2 text-ink-muted">{billingLabel(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.users.length === 0 && (
        <p className="mt-4 text-sm text-ink-faint">
          {q
            ? `Nobody matches “${q}”${show !== "all" ? " under this filter" : ""}.`
            : show !== "all"
              ? "Nobody here right now."
              : "Nobody has signed up yet."}
        </p>
      )}

      {data.pages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {data.page > 1 ? (
            <Link href={link({ page: data.page - 1 })} className="text-ink-muted hover:text-ink">
              ← Previous
            </Link>
          ) : (
            <span className="text-ink-faint">← Previous</span>
          )}
          <span className="text-ink-faint">
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages ? (
            <Link href={link({ page: data.page + 1 })} className="text-ink-muted hover:text-ink">
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
