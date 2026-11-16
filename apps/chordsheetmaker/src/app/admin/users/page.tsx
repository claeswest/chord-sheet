"use client";

import { Fragment, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SongPreviewModal from "@/components/admin/SongPreviewModal";
import PlanBadge from "@/components/admin/PlanBadge";
import UserPanel, { lastActiveIso, type AdminUser } from "@/components/admin/UserPanel";
import {
  Avatar, CARD, ErrorBox, INPUT, LINK, Loading, PageHeader, Pager, ROW, TH, countryName, fmtDate, relativeTime,
} from "@/components/admin/ui";
import {
  USER_FILTERS,
  USER_FILTER_LABELS,
  parseUserFilter,
  parseUserSort,
  type UserFilter,
  type UserSort,
} from "@/lib/adminUserFilters";

interface UsersResponse {
  users: AdminUser[];
  total: number;
  /** How many users each tab holds, within the current search. */
  counts: Record<UserFilter, number>;
  filter: UserFilter;
  page: number;
  pages: number;
}

/** What an empty tab says — "No users found" reads as broken on a tab that is merely quiet. */
const EMPTY_TEXT: Record<UserFilter, string> = {
  all: "No users found",
  paying: "No paying customers",
  trial: "Nobody is on a trial right now",
  cancelling: "Nobody has a cancellation pending",
  active: "Nobody has used the app this week",
  limit: "No free account is at the song limit",
  nosongs: "Everybody has saved at least one song",
};

/** What the count on each tab is coloured by. */
const TAB_TONE: Partial<Record<UserFilter, string>> = {
  paying: "text-emerald-700",
  trial: "text-amber-700",
  cancelling: "text-red-700",
};

function AdminUsersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const currentQ = searchParams.get("q") ?? "";
  const currentFilter = parseUserFilter(searchParams.get("filter"));
  const currentSort = parseUserSort(searchParams.get("sort"));
  const currentDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(currentQ);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);

  const load = useCallback((page: number, q: string, filter: UserFilter, sort: UserSort | null, dir: string) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    if (sort) { params.set("sort", sort); params.set("dir", dir); }
    params.set("page", String(page));
    fetch(`/api/admin/users?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load users");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(currentPage, currentQ, currentFilter, currentSort, currentDir);
  }, [currentPage, currentQ, currentFilter, currentSort, currentDir, load]);

  // The box follows the URL. It only read it once, so after Back or Forward it
  // went on showing the search you had just left.
  useEffect(() => {
    setSearch(currentQ);
  }, [currentQ]);

  // Search, tab, sort and page all live in the URL, so a view of the list can
  // be bookmarked, reloaded and gone back to.
  function href(next: { page?: number; q?: string; filter?: UserFilter; sort?: UserSort | null; dir?: string }) {
    const q = next.q ?? currentQ;
    const filter = next.filter ?? currentFilter;
    const sort = next.sort === undefined ? currentSort : next.sort;
    const dir = next.dir ?? currentDir;
    const page = next.page ?? 1;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    if (sort) { params.set("sort", sort); params.set("dir", dir); }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  // Search as you type. A short wait, so a name is one request and not one
  // per letter; replace rather than push, so Back does not step through every
  // keystroke.
  useEffect(() => {
    if (search === currentQ) return;
    const t = setTimeout(() => router.replace(href({ q: search })), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /** A column heading you can sort by: first click newest/most first, second click reverses, third clears. */
  function SortHead({ col, children, className = "" }: { col: UserSort; children: string; className?: string }) {
    const active = currentSort === col;
    const next = !active ? { sort: col, dir: "desc" } : currentDir === "desc" ? { sort: col, dir: "asc" } : { sort: null as UserSort | null, dir: "desc" };
    return (
      <th className={`${TH} ${className}`} aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : undefined}>
        <button onClick={() => router.push(href(next))} className="inline-flex items-center gap-1 uppercase tracking-[0.14em] hover:text-ink transition-colors">
          {children}
          <span aria-hidden className={active ? "text-chord" : "text-stone-300"}>{active ? (currentDir === "asc" ? "▲" : "▼") : "↕"}</span>
        </button>
      </th>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <PageHeader
        title="Users"
        sub={
          data
            ? data.filter === "all"
              ? `${data.total} account${data.total !== 1 ? "s" : ""}${currentQ ? ` matching “${currentQ}”` : ""}`
              : `${data.total} · ${USER_FILTER_LABELS[data.filter].toLowerCase()}`
            : undefined
        }
      >
        <div className="relative w-full sm:w-72">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className={`${INPUT} w-full`}
          />
        </div>
      </PageHeader>

      {/* Tabs. Counts come with each response, so they stay right while the
          list loads; until the first one arrives the tabs show without them. */}
      <div role="tablist" aria-label="Filter users" className="flex flex-wrap gap-2 mb-5">
        {USER_FILTERS.map((f, i) => {
          const active = f === currentFilter;
          const count = data?.counts?.[f];
          return (
            <Fragment key={f}>
              {/* The first four are about money, the rest about behaviour. */}
              {i === 4 && <span aria-hidden className="w-px self-stretch bg-rule mx-1" />}
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => router.push(href({ filter: f }))}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                  active ? "bg-ink text-paper border-ink font-semibold" : "bg-white text-stone-700 border-rule hover:border-ink/40"
                }`}
              >
                {USER_FILTER_LABELS[f]}
                {count !== undefined && (
                  <span className={`tabular-nums text-xs ${active ? "text-paper/70" : TAB_TONE[f] ?? "text-stone-500"}`}>{count}</span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}

      {data && (
        <>
          {/* Dimmed rather than removed while the next page or search loads:
              the list used to vanish and come back on every keystroke. */}
          <div className={`${CARD} overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>User</th>
                  <SortHead col="songs">Songs</SortHead>
                  <th className={TH}>Plan</th>
                  <th className={`${TH} hidden xl:table-cell`}>Country</th>
                  <SortHead col="joined" className="hidden lg:table-cell">Joined</SortHead>
                  <SortHead col="active" className="hidden md:table-cell">Last active</SortHead>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => {
                  const open = expandedUserId === user.id;
                  const seen = lastActiveIso(user);
                  const latest = user.songs[0];
                  return (
                    <Fragment key={user.id}>
                      <tr
                        className={`${ROW} hover:bg-paper transition-colors cursor-pointer ${open ? "bg-paper" : ""}`}
                        onClick={() => setExpandedUserId(open ? null : user.id)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name ?? user.email ?? "?"} image={user.image} />
                            <div className="min-w-0">
                              {/* The name opens their page; the rest of the row opens the panel. */}
                              <Link
                                href={`/admin/users/${encodeURIComponent(user.id)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-ink hover:underline underline-offset-4 truncate block max-w-[220px]"
                              >
                                {user.name ?? user.email ?? "—"}
                              </Link>
                              {user.name && <span className="text-xs text-stone-500 truncate block max-w-[220px]">{user.email}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-stone-700">
                          <span className="tabular-nums">{user._count.songs}</span>
                          {latest && (
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); setPreviewSongId(latest.id); }}
                              className={`block max-w-[220px] truncate text-left text-xs ${LINK}`}
                              title={`Latest: ${latest.title.trim() || "Untitled song"}, saved ${fmtDate(latest.updatedAt)}`}
                            >
                              {latest.title.trim() || "Untitled song"}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <PlanBadge plan={user.plan} status={user.stripeSubscriptionStatus} periodEnd={user.stripeCurrentPeriodEnd} cancelAt={user.stripeCancelAt} />
                        </td>
                        <td className="px-5 py-3 text-xs hidden xl:table-cell whitespace-nowrap">
                          {user.country
                            ? <span className="text-stone-700" title={user.country}>{countryName(user.country)}</span>
                            : <span className="text-stone-400" title="Not known yet: recorded the next time they use the app">—</span>}
                        </td>
                        <td className="px-5 py-3 text-stone-500 text-xs hidden lg:table-cell whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                        <td className="px-5 py-3 text-xs hidden md:table-cell whitespace-nowrap">
                          {seen ? <span className="text-stone-700">{relativeTime(seen)}</span> : <span className="text-stone-400">—</span>}
                        </td>
                        <td className="pl-4 pr-5 py-3 text-stone-400 text-right">
                          <span aria-hidden className="text-xs">{open ? "▲" : "▼"}</span>
                          <span className="sr-only">{open ? "Close" : "Open"} details</span>
                        </td>
                      </tr>

                      {open && (
                        <tr className={ROW}>
                          <td colSpan={7} className="px-5 py-5 bg-paper">
                            <p className="text-xs text-stone-500 mb-5">
                              Joined <span className="text-stone-700">{fmtDate(user.createdAt)}</span>
                              <span className="mx-2 text-stone-300">·</span>
                              Last active <span className="text-stone-700">{seen ? relativeTime(seen) : "—"}</span>
                              <span className="mx-2 text-stone-300">·</span>
                              <Link href={`/admin/users/${encodeURIComponent(user.id)}`} className={LINK}>Their page, with the timeline →</Link>
                            </p>
                            <UserPanel user={user} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {data.users.length === 0 && (
              <div className="px-5 py-12 text-center text-stone-500 border-t border-rule">
                {currentQ ? `No users match “${currentQ}”` : EMPTY_TEXT[data.filter]}
              </div>
            )}
          </div>

          <Pager page={data.page} pages={data.pages} onPage={(p) => router.push(href({ page: p }))} />
        </>
      )}

      {previewSongId && <SongPreviewModal songId={previewSongId} onClose={() => setPreviewSongId(null)} />}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-stone-500 text-sm">Loading…</div>}>
      <AdminUsersInner />
    </Suspense>
  );
}
