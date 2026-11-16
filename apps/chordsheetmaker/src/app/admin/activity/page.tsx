"use client";

import { Fragment, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Avatar, BADGE, CARD, ErrorBox, INPUT, LABEL, Loading, PageHeader, Pager, ROW, TONE, countryName, fmtDate, fmtDateTime, relativeTime,
} from "@/components/admin/ui";
import {
  TYPES, actorName, badgeFor, countryOf, groupVisits, guestIdOf, metaSummary, visitLength, visitSummary, visitTitles,
  type ActivityItem, type Visit,
} from "@/components/admin/activityLabels";

interface Feed {
  items: ActivityItem[];
  total: number;
  page: number;
  pages: number;
  /** The account the feed is filtered to, when it is. */
  filterUser: { id: string; name: string | null; email: string | null } | null;
}

/** "Today", "Yesterday", or the date — the heading over a day's rows. */
function dayHeading(ms: number): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(new Date(ms))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}
const clock = (iso: string | number) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function AdminActivityInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters. The user filter lives in the URL (?userId=…), so the users list
  // can link straight to one person's activity and a reload keeps it. Only the
  // id is in the address; the name comes back from the API.
  const userId = searchParams.get("userId") ?? "";
  const [type, setType] = useState("");
  const [hideGuests, setHideGuests] = useState(false);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [includeAdmins, setIncludeAdmins] = useState(false);
  // One row per visit, or every event on its own row.
  const [byVisit, setByVisit] = useState(true);
  const [openVisit, setOpenVisit] = useState<string | null>(null);
  // Throttled events carry repeats in meta.times — this expands them per row
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (userId) p.set("userId", userId);
    if (q) p.set("q", q);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (includeAdmins) p.set("admins", "1");
    if (hideGuests) p.set("guests", "0");
    p.set("page", String(page));
    fetch(`/api/admin/activity?${p}`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load activity"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type, userId, q, from, to, page, includeAdmins, hideGuests]);

  useEffect(() => { load(); }, [load]);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [qInput, q]);

  function selectUser(id: string) {
    setPage(1);
    router.replace(id ? `/admin/activity?userId=${encodeURIComponent(id)}` : "/admin/activity");
  }
  const filterUser = data?.filterUser && data.filterUser.id === userId ? data.filterUser : null;
  const userLabel = filterUser ? (filterUser.name ?? filterUser.email ?? "User") : "";

  const hasFilters = type || userId || q || from || to || hideGuests;

  /** One event, as a row. `indent` when it sits inside an opened visit. */
  function EventRow({ item, indent = false, showWho = true }: { item: ActivityItem; indent?: boolean; showWho?: boolean }) {
    const t = badgeFor(item);
    const guestId = guestIdOf(item);
    const who = actorName(item);
    // Throttle window repeats: count + individual timestamps
    const count = typeof item.meta?.count === "number" ? item.meta.count : 1;
    const times: string[] = [item.createdAt, ...(Array.isArray(item.meta?.times) ? (item.meta.times as string[]) : [])];
    const expanded = expandedEventId === item.id;
    return (
      <div className={indent ? "bg-paper" : ""}>
        <div className={`flex items-center gap-3 px-4 sm:px-5 py-2.5 ${indent ? "pl-14 sm:pl-16" : ""}`}>
          {showWho && (
            <button
              onClick={() => { if (item.user) selectUser(item.user.id); }}
              disabled={!item.user}
              className="flex items-center gap-2.5 w-40 sm:w-52 shrink-0 text-left group disabled:cursor-default"
              title={item.user ? `Show only ${who}` : undefined}
            >
              <Avatar name={guestId ? "?" : who} image={item.user?.image} size={28} muted={!item.user} />
              <span className="text-sm text-ink truncate group-enabled:group-hover:underline underline-offset-4">{who}</span>
            </button>
          )}

          <span className={`${BADGE} ${TONE[t.tone]} shrink-0`}>{t.label}</span>

          {/* Repeats within the 30-min throttle window — click to expand */}
          {count > 1 && (
            <button
              onClick={() => setExpandedEventId(expanded ? null : item.id)}
              className="shrink-0 text-[11px] px-1.5 py-0.5 rounded-full font-semibold bg-paper-deep text-stone-700 border border-rule hover:border-ink/40 transition-colors whitespace-nowrap"
              title={`${count} times within 30 min — click to ${expanded ? "collapse" : "expand"}`}
            >
              ×{count} {expanded ? "▴" : "▾"}
            </button>
          )}

          <span className="flex-1 min-w-0 text-xs text-stone-600 truncate">{metaSummary(item)}</span>

          {!indent && countryOf(item) && (
            <span className="hidden sm:inline shrink-0 text-xs text-stone-500 whitespace-nowrap" title={countryOf(item)!}>{countryName(countryOf(item))}</span>
          )}
          <span className="shrink-0 text-xs text-stone-500 whitespace-nowrap tabular-nums" title={fmtDateTime(item.createdAt)}>
            {indent ? clock(item.createdAt) : relativeTime(item.createdAt)}
          </span>
        </div>
        {expanded && (
          <div className={`px-4 sm:px-5 pb-3 ${indent ? "pl-14 sm:pl-16" : "pl-16 sm:pl-20"}`}>
            <div className="flex flex-wrap gap-1.5">
              {times.map((ts, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-paper-deep text-stone-600 font-mono">
                  {new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /** A visit of several events, as one row that opens. */
  function VisitRow({ visit }: { visit: Visit }) {
    const first = visit.items[0];
    const guestId = guestIdOf(first);
    const who = actorName(first);
    const open = openVisit === visit.key;
    const titles = visitTitles(visit);
    const length = visitLength(visit);
    const country = visit.items.map(countryOf).find(Boolean) ?? null;
    return (
      <div>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
          <button
            onClick={() => { if (first.user) selectUser(first.user.id); }}
            disabled={!first.user}
            className="flex items-center gap-2.5 w-40 sm:w-52 shrink-0 text-left group disabled:cursor-default"
            title={first.user ? `Show only ${who}` : undefined}
          >
            <Avatar name={guestId ? "?" : who} image={first.user?.image} size={28} muted={!first.user} />
            <span className="text-sm text-ink truncate group-enabled:group-hover:underline underline-offset-4">{who}</span>
          </button>

          <button onClick={() => setOpenVisit(open ? null : visit.key)} aria-expanded={open} className="flex-1 min-w-0 text-left group/visit">
            <span className="block text-sm text-ink first-letter:uppercase truncate">
              {visitSummary(visit)}
              <span aria-hidden className="ml-2 text-xs text-stone-400 group-hover/visit:text-ink">{open ? "▴" : "▾"}</span>
            </span>
            <span className="block text-xs text-stone-500 truncate mt-0.5">
              {visit.items.length} events{length ? ` over ${length}` : ""}{country ? ` · ${countryName(country)}` : ""}
              {titles.length > 0 && <> · {titles.slice(0, 3).map((t) => `“${t}”`).join(", ")}{titles.length > 3 ? ` +${titles.length - 3}` : ""}</>}
            </span>
          </button>

          <span className="shrink-0 text-xs text-stone-500 whitespace-nowrap tabular-nums" title={`${fmtDateTime(new Date(visit.startedAt))} to ${clock(visit.endedAt)}`}>
            {relativeTime(new Date(visit.endedAt).toISOString())}
          </span>
        </div>
        {open && (
          <div className="border-t border-rule divide-y divide-rule">
            {visit.items.map((item) => <EventRow key={item.id} item={item} indent showWho={false} />)}
          </div>
        )}
      </div>
    );
  }

  const visits: Visit[] = data
    ? byVisit
      ? groupVisits(data.items)
      : data.items.map((item) => ({ key: item.id, items: [item], startedAt: new Date(item.createdAt).getTime(), endedAt: new Date(item.createdAt).getTime() }))
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Activity" sub={data ? `${data.total} event${data.total !== 1 ? "s" : ""}` : undefined} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={INPUT} aria-label="Kind of event">
          <option value="">All events</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {/* Labelled: two bare date boxes side by side don't say which is the
            start and which the end. */}
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={INPUT} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={INPUT} />
        </label>
        <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search user or song…" aria-label="Search activity" className={`${INPUT} w-52`} />
        {[
          { label: "Group by visit", checked: byVisit, set: (v: boolean) => setByVisit(v), show: true },
          { label: "Include my activity", checked: includeAdmins, set: (v: boolean) => { setIncludeAdmins(v); setPage(1); }, show: true },
          // Pointless while one account is selected — that already excludes visitors.
          { label: "Hide visitors", checked: hideGuests, set: (v: boolean) => { setHideGuests(v); setPage(1); }, show: !userId },
        ].filter((c) => c.show).map((c) => (
          <label key={c.label} className="flex items-center gap-2 text-xs text-stone-600 hover:text-ink cursor-pointer select-none transition-colors">
            <input type="checkbox" checked={c.checked} onChange={(e) => c.set(e.target.checked)} className="w-3.5 h-3.5 accent-[#1c1917]" />
            {c.label}
          </label>
        ))}
        {userId && (
          <span className={`${BADGE} ${TONE.info} inline-flex items-center gap-1.5 !text-xs !px-2.5 !py-1`}>
            <Link href={`/admin/users/${encodeURIComponent(userId)}`} className="hover:underline underline-offset-4">{userLabel || "User"}</Link>
            <button onClick={() => selectUser("")} className="hover:text-ink" aria-label="Show everyone's activity">×</button>
          </span>
        )}
        {hasFilters && (
          <button
            onClick={() => { setType(""); setHideGuests(false); setQ(""); setQInput(""); setFrom(""); setTo(""); selectUser(""); }}
            className="text-xs text-stone-600 hover:text-ink underline underline-offset-4 decoration-ink/25 transition-colors"
          >Clear all</button>
        )}
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}

      {data && (
        <>
          <div className={`${CARD} overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data.items.length === 0 && (
              <p className="px-5 py-10 text-center text-stone-500 text-sm">
                {userId && !type && !q && !from && !to
                  ? `${userLabel || "This user"} has no recorded activity.`
                  : "No events match these filters."}
              </p>
            )}
            {visits.map((visit, i) => {
              const heading = dayHeading(visit.endedAt);
              const newDay = i === 0 || dayHeading(visits[i - 1].endedAt) !== heading;
              return (
                <Fragment key={visit.key}>
                  {newDay && (
                    <p className={`${LABEL} px-4 sm:px-5 py-2 bg-paper-deep ${i ? "border-t border-rule" : ""}`}>
                      {heading}{heading === "Today" || heading === "Yesterday" ? <span className="normal-case tracking-normal text-stone-400"> · {fmtDate(new Date(visit.endedAt))}</span> : null}
                    </p>
                  )}
                  <div className={newDay ? "border-t border-rule" : ROW}>
                    {visit.items.length > 1 ? <VisitRow visit={visit} /> : <EventRow item={visit.items[0]} />}
                  </div>
                </Fragment>
              );
            })}
          </div>

          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// useSearchParams needs a Suspense boundary above it.
export default function AdminActivityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-stone-500 text-sm">Loading…</div>}>
      <AdminActivityInner />
    </Suspense>
  );
}
