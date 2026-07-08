"use client";

import { useCallback, useEffect, useState } from "react";
import { relativeTime } from "@/components/admin/PlanBadge";

interface Item {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
}

interface Feed {
  items: Item[];
  total: number;
  page: number;
  pages: number;
}

// Friendly label + badge color per event type (also drives the filter dropdown).
const TYPES: Record<string, { label: string; cls: string }> = {
  account_created: { label: "Account created", cls: "bg-emerald-900/40 text-emerald-300" },
  login:           { label: "Login",           cls: "bg-zinc-800 text-zinc-400" },
  sub_started:     { label: "Subscription started", cls: "bg-amber-900/40 text-amber-300" },
  sub_changed:     { label: "Subscription changed", cls: "bg-emerald-900/40 text-emerald-300" },
  sub_ended:       { label: "Subscription ended",   cls: "bg-red-900/40 text-red-300" },
  song_created:    { label: "Song created",  cls: "bg-indigo-900/40 text-indigo-300" },
  song_opened:     { label: "Song opened",   cls: "bg-zinc-800 text-zinc-400" },
  song_edited:     { label: "Song edited",   cls: "bg-violet-900/40 text-violet-300" },
  chord_added:     { label: "Chord added",   cls: "bg-zinc-800 text-zinc-400" },
  pdf_exported:    { label: "PDF exported",  cls: "bg-cyan-900/40 text-cyan-300" },
  song_imported:   { label: "Song imported", cls: "bg-blue-900/40 text-blue-300" },
  bg_generated:    { label: "AI background", cls: "bg-fuchsia-900/40 text-fuchsia-300" },
  ai_styled:       { label: "AI text style", cls: "bg-purple-900/40 text-purple-300" },
  style_changed:   { label: "Styled",        cls: "bg-pink-900/40 text-pink-300" },
  marketing_email: { label: "Nudge email sent", cls: "bg-orange-900/40 text-orange-300" },
};

// Friendly labels for song_created origins (and song_imported sources)
const ORIGIN_LABELS: Record<string, string> = {
  "ai-search": "AI search",
  "pasted-text": "pasted text",
  photo: "photo",
  template: "template",
  scratch: "written from scratch",
  demo: "demo song",
  duplicate: "duplicated",
  search: "AI search", // song_imported beacon uses "search"
  text: "pasted text",
};

function metaSummary(item: Item): string {
  const m = item.meta ?? {};
  const parts: string[] = [];
  if (typeof m.title === "string" && m.title) parts.push(`"${m.title}"`);
  if (typeof m.plan === "string") parts.push(m.plan + (typeof m.status === "string" ? ` (${m.status})` : ""));
  if (typeof m.source === "string") parts.push(`via ${ORIGIN_LABELS[m.source] ?? m.source}`);
  if (typeof m.origin === "string") parts.push(`via ${ORIGIN_LABELS[m.origin] ?? m.origin}`);
  if (typeof m.email === "string" && !item.user) parts.push(m.email);
  return parts.join(" · ");
}

export default function AdminActivityPage() {
  const [data, setData] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [type, setType] = useState("");
  const [userId, setUserId] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [includeAdmins, setIncludeAdmins] = useState(false);

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
    p.set("page", String(page));
    fetch(`/api/admin/activity?${p}`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load activity"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type, userId, q, from, to, page, includeAdmins]);

  useEffect(() => { load(); }, [load]);

  const hasFilters = type || userId || q || from || to;
  const inputCls = "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        {data && <p className="text-zinc-400 text-sm mt-1">{data.total} event{data.total !== 1 ? "s" : ""}</p>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All events</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} title="From" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} title="To" />
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(qInput); setPage(1); }}>
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search user or song…" className={`${inputCls} w-48`} />
          <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Search</button>
        </form>
        <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 px-1 cursor-pointer select-none transition-colors">
          <input
            type="checkbox"
            checked={includeAdmins}
            onChange={(e) => { setIncludeAdmins(e.target.checked); setPage(1); }}
            className="w-3.5 h-3.5 accent-indigo-500"
          />
          Include my activity
        </label>
        {userId && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-900/40 text-indigo-300 px-2.5 py-1.5 rounded-full">
            {userLabel || "User"}
            <button onClick={() => { setUserId(""); setUserLabel(""); setPage(1); }} className="hover:text-white">×</button>
          </span>
        )}
        {hasFilters && (
          <button
            onClick={() => { setType(""); setUserId(""); setUserLabel(""); setQ(""); setQInput(""); setFrom(""); setTo(""); setPage(1); }}
            className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5"
          >Clear all</button>
        )}
      </div>

      {loading && <div className="text-zinc-400 text-sm">Loading…</div>}
      {error && <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-5 py-4 text-sm">{error}</div>}

      {data && !loading && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
            {data.items.length === 0 && (
              <p className="px-5 py-10 text-center text-zinc-500 text-sm">No events match these filters.</p>
            )}
            {data.items.map((item) => {
              const t = TYPES[item.type] ?? { label: item.type, cls: "bg-zinc-800 text-zinc-400" };
              const who = item.user?.name ?? item.user?.email ?? "Deleted user";
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                  {/* User (click = filter) */}
                  <button
                    onClick={() => { if (item.user) { setUserId(item.user.id); setUserLabel(who); setPage(1); } }}
                    disabled={!item.user}
                    className="flex items-center gap-2.5 w-40 sm:w-52 shrink-0 text-left group disabled:cursor-default"
                    title={item.user ? `Filter by ${who}` : undefined}
                  >
                    {item.user?.image ? (
                      <img src={item.user.image} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {who[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className="text-sm text-white truncate group-hover:text-indigo-300 transition-colors">{who}</span>
                  </button>

                  <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${t.cls}`}>
                    {t.label}
                  </span>

                  <span className="flex-1 min-w-0 text-xs text-zinc-400 truncate">{metaSummary(item)}</span>

                  <span
                    className="shrink-0 text-xs text-zinc-500 whitespace-nowrap"
                    title={new Date(item.createdAt).toLocaleString("sv-SE")}
                  >
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-zinc-500">Page {data.page} of {data.pages}</p>
              <div className="flex gap-2">
                <button disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors">← Prev</button>
                <button disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
