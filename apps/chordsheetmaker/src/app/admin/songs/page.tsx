"use client";

// Admin → Songs: what people make with the app.
//
// Two halves. The numbers at the top describe the whole library (stat tiles
// for single figures, plain single-series bars for the three breakdowns —
// one hue, no legend, the value written beside each bar). The list below is
// every song with its owner, origin, length and styling, filterable on all of
// them. Clicking an origin bar filters the list to it.
//
// Both halves leave out the admins' own songs unless "Include my songs" is on:
// test songs outnumbered real ones on the dev database.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SongPreviewModal from "@/components/admin/SongPreviewModal";
import { relativeTime } from "@/components/admin/PlanBadge";
import { ALL_FONTS } from "@/lib/songStyle";
import {
  BG_FILTERS,
  ORIGIN_LABELS,
  PROVENANCE_SINCE,
  SONG_ORIGINS,
  SONG_SORTS,
  pick,
  type AdminSongRow,
  type AdminSongStats,
  type BgFilter,
  type SongOrigin,
  type SongSort,
} from "@/lib/adminSongs";

interface ListResponse {
  songs: AdminSongRow[];
  total: number;
  page: number;
  pages: number;
}

const BG_LABELS: Record<BgFilter, string> = {
  any: "Has a background",
  none: "No background",
  ai: "AI background",
  upload: "Uploaded background",
  untracked: "Background, source not recorded",
};

const SORT_LABELS: Record<SongSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  updated: "Recently edited",
  longest: "Longest first",
};

const nf = new Intl.NumberFormat("en-US");
const fmt = (n: number) => nf.format(Math.round(n));
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "'Lora', serif" → "Lora"; the system stack → its name in the editor's own font list. */
function fontName(stack: string | null): string {
  if (!stack) return "Default";
  const known = ALL_FONTS.find((f) => f.stack === stack);
  if (known) return known.name;
  return stack.split(",")[0].replace(/['"]/g, "").trim() || stack;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-5 border bg-white border-rule">
      <p className="text-xs font-medium text-stone-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

/**
 * A horizontal bar per row, one hue, the value written after the bar. Hovering
 * a row shows its exact count and share; rows with onPick are buttons.
 */
function BarList({
  title,
  rows,
  total,
  onPick,
  active,
  footnote,
}: {
  title: string;
  rows: { key: string; label: string; n: number }[];
  total: number;
  onPick?: (key: string) => void;
  active?: string | null;
  footnote?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-xl p-5 border bg-white border-rule">
      <p className="text-xs font-medium text-stone-600 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => {
          // Label and value on one line, the bar under them at full width. Side
          // by side, a third-width card left the bar no room and it vanished.
          const inner = (
            <>
              <span className="flex items-baseline justify-between gap-3">
                <span className={`truncate text-left ${active === r.key ? "text-ink font-semibold" : "text-stone-700"}`}>{r.label}</span>
                <span className="shrink-0 tabular-nums text-stone-700">
                  {fmt(r.n)} <span className="text-stone-500 text-[11px]">{pct(r.n, total)}</span>
                </span>
              </span>
              <span className="block h-1.5 mt-1 rounded-sm bg-paper-deep overflow-hidden">
                <span
                  className={`block h-full rounded-r ${active === r.key ? "bg-ink" : "bg-chord"}`}
                  style={{ width: `${Math.max(r.n ? 2 : 0, (r.n / max) * 100)}%` }}
                />
              </span>
            </>
          );
          const tip = `${r.label}: ${fmt(r.n)} of ${fmt(total)} (${pct(r.n, total)})`;
          return onPick ? (
            <button
              key={r.key}
              type="button"
              title={`${tip} — click to filter`}
              onClick={() => onPick(r.key)}
              aria-pressed={active === r.key}
              className="block w-full text-xs py-1 px-1.5 -mx-1.5 rounded hover:bg-paper focus-visible:outline-2 focus-visible:outline-ink"
            >
              {inner}
            </button>
          ) : (
            <div key={r.key} title={tip} className="block text-xs py-1">
              {inner}
            </div>
          );
        })}
      </div>
      {footnote && <p className="text-[11px] text-stone-500 mt-3 leading-snug">{footnote}</p>}
    </div>
  );
}

/** New songs per week, twelve weeks, oldest left. One hue; hover a bar for its week. */
function WeekBars({ weeks }: { weeks: AdminSongStats["weeks"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.n));
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <div className="rounded-xl p-5 border bg-white border-rule">
      <p className="text-xs font-medium text-stone-600 uppercase tracking-widest mb-3">New songs per week</p>
      <div className="flex items-end gap-[2px] h-28" role="img" aria-label={weeks.map((w) => `Week of ${label(w.week)}: ${w.n}`).join(", ")}>
        {weeks.map((w) => (
          <div key={w.week} className="group relative flex-1 h-full flex flex-col justify-end" title={`Week of ${label(w.week)}: ${w.n} song${w.n === 1 ? "" : "s"}`}>
            <span className="text-[10px] text-stone-600 text-center tabular-nums mb-0.5 opacity-0 group-hover:opacity-100">{w.n}</span>
            <div
              className="w-full rounded-t-[4px] bg-chord group-hover:bg-ink"
              style={{ height: w.n ? `${Math.max(4, (w.n / max) * 100)}%` : "1px", opacity: w.n ? 1 : 0.35 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-stone-500 mt-1.5">
        <span>{weeks[0] ? label(weeks[0].week) : ""}</span>
        <span>this week</span>
      </div>
    </div>
  );
}

function SongsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // Everything the list shows is in the URL, so a filtered view can be
  // reloaded, bookmarked and gone back to.
  const q = sp.get("q") ?? "";
  const origin = pick(SONG_ORIGINS, sp.get("origin"));
  const bg = pick(BG_FILTERS, sp.get("bg"));
  const ai = sp.get("ai") === "1";
  const empty = sp.get("empty") === "1";
  const sort = pick(SONG_SORTS, sp.get("sort")) ?? "newest";
  const admins = sp.get("admins") === "1";
  const page = parseInt(sp.get("page") ?? "1", 10) || 1;

  const [stats, setStats] = useState<AdminSongStats | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => setSearch(q), [q]);

  const setParams = useCallback(
    (patch: Record<string, string | null>, keepPage = false) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!keepPage) next.delete("page");
      if (next.get("sort") === "newest") next.delete("sort");
      router.push(`/admin/songs${next.toString() ? `?${next}` : ""}`);
    },
    [router, sp],
  );

  // Stats depend only on whose songs are counted.
  useEffect(() => {
    setStats(null);
    fetch(`/api/admin/songs/stats${admins ? "?admins=1" : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load song stats"))))
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [admins]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (origin) p.set("origin", origin);
    if (bg) p.set("bg", bg);
    if (ai) p.set("ai", "1");
    if (empty) p.set("empty", "1");
    if (sort !== "newest") p.set("sort", sort);
    if (admins) p.set("admins", "1");
    p.set("page", String(page));
    fetch(`/api/admin/songs?${p}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load songs"))))
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, origin, bg, ai, empty, sort, admins, page]);

  const filtered = !!(q || origin || bg || ai || empty);
  const selectCls =
    "bg-paper-deep border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20";
  const since = formatDate(PROVENANCE_SINCE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-medium text-3xl sm:text-4xl tracking-[-0.02em] text-ink">Songs</h1>
          <p className="text-stone-600 text-sm mt-1">What people make with the app</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-600 hover:text-ink cursor-pointer select-none mt-2">
          <input
            type="checkbox"
            checked={admins}
            onChange={(e) => setParams({ admins: e.target.checked ? "1" : null })}
            className="w-3.5 h-3.5 accent-[#1c1917]"
          />
          Include my songs
        </label>
      </div>

      {/* ── The library in numbers ─────────────────────────────────────── */}
      {!stats && !error && <p className="text-stone-600 text-sm mb-8">Loading numbers…</p>}
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Tile label="Songs" value={fmt(stats.total)} sub={`+${stats.new7} this week · +${stats.new30} in 30 days`} />
            <Tile
              label="Characters per song"
              value={fmt(stats.medianChars)}
              sub={`median · mean ${fmt(stats.avgChars)} · ${stats.avgLines} lines`}
            />
            <Tile label="Chords per song" value={fmt(stats.avgChords)} sub={`mean · ${stats.avgSections} sections`} />
            <Tile label="Authors" value={fmt(stats.authors)} sub={`${(stats.authors ? stats.total / stats.authors : 0).toFixed(1)} songs each`} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Tile
              label="With background"
              value={pct(stats.withBg, stats.total)}
              sub={`${fmt(stats.withBg)} songs · ${fmt(stats.bgAi)} AI · ${fmt(stats.bgUpload)} uploaded`}
            />
            <Tile
              label="AI text style"
              value={fmt(stats.aiStyled)}
              sub={`recorded since ${since} · ${fmt(stats.trackedSince)} songs saved since`}
            />
            <Tile label="Empty songs" value={fmt(stats.empty)} sub="no lyric lines at all" />
            <Tile label="Stored size" value={kb(stats.avgBytes)} sub={`mean · largest ${kb(stats.maxBytes)}`} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
            <BarList
              title="How songs were created"
              total={stats.total}
              active={origin}
              onPick={(k) => setParams({ origin: origin === k ? null : k })}
              rows={stats.origins.map((o) => ({
                key: o.origin,
                label: ORIGIN_LABELS[o.origin as SongOrigin] ?? o.origin,
                n: o.n,
              }))}
              footnote="Click a row to filter the list. “Not recorded” is songs from before the origin was logged."
            />
            <WeekBars weeks={stats.weeks} />
            <BarList
              title="Lyric fonts"
              total={stats.total}
              rows={stats.fonts.map((f) => ({ key: f.font ?? "default", label: fontName(f.font), n: f.n }))}
            />
          </div>
        </>
      )}

      {/* ── Every song ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: search.trim() || null });
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, artist or owner…"
            className={`${selectCls} w-56 placeholder:text-stone-400`}
          />
          <button type="submit" className="px-3 py-2 bg-ink hover:bg-stone-700 text-paper text-sm font-medium rounded-lg">
            Search
          </button>
        </form>
        <select value={origin ?? ""} onChange={(e) => setParams({ origin: e.target.value || null })} className={selectCls} aria-label="Origin">
          <option value="">Any origin</option>
          {SONG_ORIGINS.map((o) => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
        </select>
        <select value={bg ?? ""} onChange={(e) => setParams({ bg: e.target.value || null })} className={selectCls} aria-label="Background">
          <option value="">Any background</option>
          {BG_FILTERS.map((b) => <option key={b} value={b}>{BG_LABELS[b]}</option>)}
        </select>
        <select value={sort} onChange={(e) => setParams({ sort: e.target.value })} className={selectCls} aria-label="Sort">
          {SONG_SORTS.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-stone-600 hover:text-ink px-1 cursor-pointer select-none">
          <input type="checkbox" checked={ai} onChange={(e) => setParams({ ai: e.target.checked ? "1" : null })} className="w-3.5 h-3.5 accent-[#1c1917]" />
          AI text style
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-600 hover:text-ink px-1 cursor-pointer select-none">
          <input type="checkbox" checked={empty} onChange={(e) => setParams({ empty: e.target.checked ? "1" : null })} className="w-3.5 h-3.5 accent-[#1c1917]" />
          Empty only
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => setParams({ q: null, origin: null, bg: null, ai: null, empty: null })}
            className="text-xs text-stone-600 hover:text-ink px-2 py-1.5"
          >
            Clear filters
          </button>
        )}
        {list && <span className="ml-auto text-sm text-stone-500 tabular-nums">{fmt(list.total)} song{list.total === 1 ? "" : "s"}</span>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-4 text-sm mb-4">{error}</div>}
      {loading && !list && <p className="text-stone-600 text-sm">Loading…</p>}

      {list && (
        <>
          <div className={`bg-white border border-rule rounded-xl overflow-x-auto ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Song</th>
                  <th className="px-5 py-3 hidden md:table-cell">Owner</th>
                  <th className="px-5 py-3">Origin</th>
                  <th className="px-5 py-3 hidden sm:table-cell text-right">Length</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Style</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.songs.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setPreviewId(s.id)}
                    className="border-b border-rule hover:bg-paper cursor-pointer"
                  >
                    <td className="px-5 py-3 max-w-[260px]">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewId(s.id); }}
                        className="block text-left w-full rounded focus-visible:outline-2 focus-visible:outline-ink"
                      >
                        <span className={`block truncate font-medium ${s.title.trim() ? "text-ink" : "italic text-stone-500"}`}>
                          {s.title.trim() || "Untitled song"}
                        </span>
                        {s.artist && <span className="block truncate text-xs text-stone-500">{s.artist}</span>}
                      </button>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/activity?userId=${encodeURIComponent(s.userId)}`}
                        title="View this person's activity"
                        className="block truncate text-stone-700 hover:text-chord"
                      >
                        {s.userName ?? s.userEmail ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${s.origin === "unknown" ? "bg-paper-deep text-stone-500" : "bg-[#e6ebf2] text-chord"}`}>
                        {ORIGIN_LABELS[s.origin] ?? s.origin}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-right tabular-nums text-xs whitespace-nowrap">
                      {s.lines === 0 ? (
                        <span className="text-amber-700">empty</span>
                      ) : (
                        <span className="text-stone-700" title={`${s.lines} lyric lines · ${s.chords} chords · ${s.sections} sections`}>
                          {fmt(s.chars)} chars
                          <span className="block text-stone-500">{s.lines} lines · {s.chords} chords</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {s.hasBg && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e6ebf2] text-[#2d4a73] whitespace-nowrap">
                            {s.bgSource === "ai" ? "AI background" : s.bgSource === "upload" ? "Own image" : "Background"}
                          </span>
                        )}
                        {s.aiStyled && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e6ebf2] text-[#2d4a73] whitespace-nowrap">AI style</span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper-deep text-stone-600 whitespace-nowrap">{fontName(s.font)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs whitespace-nowrap">
                      <span className="text-stone-600" title={`Created ${formatDate(s.createdAt)} · edited ${formatDate(s.updatedAt)}`}>
                        {relativeTime(s.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.songs.length === 0 && (
              <div className="px-5 py-12 text-center text-stone-500">No songs match these filters</div>
            )}
          </div>

          {list.pages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-stone-500">Page {list.page} of {list.pages}</p>
              <div className="flex gap-2">
                <button
                  disabled={list.page <= 1}
                  onClick={() => setParams({ page: String(list.page - 1) }, true)}
                  className="px-4 py-2 bg-paper-deep hover:bg-stone-200 disabled:opacity-40 text-ink text-sm rounded-lg"
                >
                  ← Prev
                </button>
                <button
                  disabled={list.page >= list.pages}
                  onClick={() => setParams({ page: String(list.page + 1) }, true)}
                  className="px-4 py-2 bg-paper-deep hover:bg-stone-200 disabled:opacity-40 text-ink text-sm rounded-lg"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {previewId && <SongPreviewModal songId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}

// useSearchParams needs a Suspense boundary above it.
export default function AdminSongsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-stone-600">Loading…</div>}>
      <SongsInner />
    </Suspense>
  );
}
