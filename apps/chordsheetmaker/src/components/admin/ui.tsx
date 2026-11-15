// The admin's building blocks: one set of surfaces, labels, buttons and
// dates, in the same paper and ink as the rest of the site. The admin used to
// be a separate dark design with its own purple; nothing in it was shared.

import type { ReactNode } from "react";

export const CARD = "bg-white border border-rule rounded-lg";
export const LABEL = "font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500";
export const INPUT =
  "bg-white border border-rule rounded-lg px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-ink transition-colors";
const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
export const BTN = `${BTN_BASE} bg-ink text-paper hover:bg-stone-700`;
export const BTN_LINE = `${BTN_BASE} bg-white border border-ink/20 text-ink hover:border-ink/60`;
export const LINK = "text-chord hover:underline underline-offset-4";
export const TH = "text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500";
export const ROW = "border-t border-rule";

/** Badge colours by meaning, not by event: good news, a warning, bad news, neutral information. */
export const TONE = {
  good: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border border-amber-200",
  bad: "bg-red-50 text-red-800 border border-red-200",
  info: "bg-[#e6ebf2] text-[#2d4a73] border border-[#cdd8e6]",
  quiet: "bg-paper-deep text-stone-600 border border-rule",
} as const;
export type Tone = keyof typeof TONE;
export const BADGE = "inline-block text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap";

// ── Dates, in the site's own format ("8 Sept 2026") ─────────────────────────

export function fmtDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "8 Sept" — for axes and lists where the year is obvious. */
export function fmtDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return `${fmtDay(d)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

/** "4 min ago" / "3h ago" / "5d ago" / "12 Jun 2026". */
export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) {
    const m = Math.floor(ms / 60_000);
    return m < 1 ? "just now" : `${m} min ago`;
  }
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

/** "in 2 days" / "tomorrow" / "today" — for dates that are coming. */
export function untilLabel(iso: string): string {
  // Calendar days, not 24-hour blocks: a trial ending the day after tomorrow
  // is "in 2 days" whether that is 47 hours away or 49.
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date(iso)) - startOf(new Date())) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display font-medium text-3xl sm:text-4xl tracking-[-0.02em] text-ink">{title}</h1>
        {sub && <p className="text-stone-600 text-sm mt-1.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Avatar({ name, image, size = 32, muted = false }: { name: string; image?: string | null; size?: number; muted?: boolean }) {
  const style = { width: size, height: size };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" referrerPolicy="no-referrer" style={style} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div
      style={{ ...style, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${muted ? "bg-paper-deep text-stone-500 border border-rule" : "bg-ink text-paper"}`}
    >
      {(name[0] ?? "?").toUpperCase()}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-stone-500 text-sm">
      <div className="w-4 h-4 border-2 border-rule border-t-ink rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-5 py-4 text-sm">{children}</div>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-5">
      <p className="text-sm text-stone-500">Page {page} of {pages}</p>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={BTN_LINE}>← Prev</button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className={BTN_LINE}>Next →</button>
      </div>
    </div>
  );
}
