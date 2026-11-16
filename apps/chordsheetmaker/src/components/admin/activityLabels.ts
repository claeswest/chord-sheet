// How one activity-log row reads: its badge, its detail line, and how a run
// of rows from one person is summed up as a visit. Shared by the activity
// feed and the timeline on a user's page.

import { fmtDate, type Tone } from "./ui";

export interface ActivityItem {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
}

// Friendly label + tone per event type (also drives the filter dropdown).
// Colour carries meaning, not variety: green and red are for money arriving
// and leaving, amber for something pending, blue for something made, and grey
// for the routine. It used to be a different colour for each of fifteen types.
export const TYPES: Record<string, { label: string; tone: Tone }> = {
  account_created: { label: "Account created", tone: "good" },
  login:           { label: "Signed in", tone: "quiet" },
  sub_started:     { label: "Subscription started", tone: "warn" },
  sub_changed:     { label: "Subscription changed", tone: "good" },
  sub_ended:       { label: "Subscription ended", tone: "bad" },
  song_created:    { label: "Song created", tone: "info" },
  song_opened:     { label: "Song opened", tone: "quiet" },
  song_edited:     { label: "Song edited", tone: "quiet" },
  chord_added:     { label: "Chord added", tone: "quiet" },
  pdf_exported:    { label: "PDF exported", tone: "info" },
  share_created:   { label: "Share link made", tone: "info" },
  song_imported:   { label: "Song imported", tone: "info" },
  bg_generated:    { label: "AI picture", tone: "info" },
  ai_styled:       { label: "AI text style", tone: "info" },
  style_changed:   { label: "Styled", tone: "quiet" },
  marketing_email: { label: "Email sent", tone: "quiet" },
  // Bookkeeping: hidden from the feed unless picked here.
  ai_call:         { label: "AI read (bookkeeping)", tone: "quiet" },
  job_run:         { label: "Daily email job (bookkeeping)", tone: "quiet" },
};

/**
 * The badge for one event. A scheduled cancellation is logged as sub_changed,
 * and so wore the green "Subscription changed" badge — the same one as a trial
 * converting to paid — with the bad news only in the small print beside it.
 */
export function badgeFor(item: ActivityItem): { label: string; tone: Tone } {
  if (item.type === "sub_changed" && item.meta?.event === "cancel_scheduled") {
    return { label: "Cancellation scheduled", tone: "bad" };
  }
  if (item.type === "sub_changed" && item.meta?.event === "cancel_reverted") {
    return { label: "Cancellation reversed", tone: "good" };
  }
  return TYPES[item.type] ?? { label: item.type, tone: "quiet" };
}

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

const VIA_LABELS: Record<string, string> = {
  banner: "from the one-click banner",
  toolbar: "from the Style it button",
  offer: "from the Style it offer",
  panel: "from Style it in the panel",
  again: "from Try another",
};

export function metaSummary(item: ActivityItem): string {
  const m = item.meta ?? {};
  const parts: string[] = [];
  if (item.type === "job_run") {
    const n = (k: string) => (typeof m[k] === "number" ? (m[k] as number) : 0);
    parts.push(`${n("sent")} sent, ${n("failed")} failed, ${n("skipped")} skipped, of ${n("due")} due`);
    if (m.dryRun === true) parts.push("dry run");
    return parts.join(" · ");
  }
  if (item.type === "ai_call" && typeof m.kind === "string") {
    parts.push(m.kind === "photo" ? "photo read" : m.kind === "paste" ? "pasted text" : "song search");
  }
  if (typeof m.title === "string" && m.title) parts.push(`“${m.title}”`);
  // The badge says a cancellation was scheduled; this adds until when.
  if (m.event === "cancel_scheduled" && typeof m.cancelAt === "string") {
    parts.push(`access until ${fmtDate(m.cancelAt)}`);
  }
  if (typeof m.plan === "string") parts.push(m.plan + (typeof m.status === "string" ? ` (${m.status})` : ""));
  if (typeof m.source === "string") parts.push(`via ${ORIGIN_LABELS[m.source] ?? m.source}`);
  if (typeof m.origin === "string") parts.push(`via ${ORIGIN_LABELS[m.origin] ?? m.origin}`);
  if (typeof m.via === "string" && VIA_LABELS[m.via]) parts.push(VIA_LABELS[m.via]);
  // Which email, and whether a person or the daily job sent it.
  if (item.type === "marketing_email" && typeof m.template === "string") {
    parts.push(m.template.replace(/_/g, " ") + (m.auto === true ? " · sent automatically" : ""));
  }
  if (typeof m.email === "string" && !item.user) parts.push(m.email);
  return parts.join(" · ");
}

/** Where an event came from, as two letters, when that was recorded. */
export function countryOf(item: ActivityItem): string | null {
  return typeof item.meta?.country === "string" ? item.meta.country : null;
}

/** The per-browser id a visitor's events carry. */
export function guestIdOf(item: ActivityItem): string | null {
  return !item.user && typeof item.meta?.guest === "string" ? item.meta.guest : null;
}

export function actorName(item: ActivityItem): string {
  if (item.type === "job_run") return "Daily email job";
  const guest = guestIdOf(item);
  return item.user?.name ?? item.user?.email ?? (guest ? `Visitor ${guest}` : "Deleted user");
}

// ── Visits ───────────────────────────────────────────────────────────────────

export interface Visit {
  key: string;
  items: ActivityItem[]; // newest first, as the feed gives them
  startedAt: number;
  endedAt: number;
}

/** A pause longer than this starts a new visit. */
const VISIT_GAP_MS = 30 * 60 * 1000;

/** Every moment an event stands for: its own, and the repeats folded into it. */
function momentsOf(item: ActivityItem): number[] {
  const times = Array.isArray(item.meta?.times) ? (item.meta!.times as string[]) : [];
  return [item.createdAt, ...times].map((t) => new Date(t).getTime()).filter((t) => !isNaN(t));
}

/**
 * Fold a feed (newest first) into visits: consecutive rows from the same
 * person with no long pause between them. "Consecutive" matters — two people
 * working at the same time interleave, and each stretch is then its own row,
 * which keeps the feed in time order.
 */
export function groupVisits(items: ActivityItem[]): Visit[] {
  const visits: Visit[] = [];
  for (const item of items) {
    const actor = item.user?.id ?? guestIdOf(item) ?? `none-${item.id}`;
    const moments = momentsOf(item);
    const first = Math.min(...moments);
    const last = Math.max(...moments);
    const open = visits[visits.length - 1];
    if (open && open.key.startsWith(`${actor}|`) && item.type !== "job_run" && open.startedAt - last <= VISIT_GAP_MS) {
      open.items.push(item);
      open.startedAt = Math.min(open.startedAt, first);
      open.endedAt = Math.max(open.endedAt, last);
    } else {
      visits.push({ key: `${actor}|${item.id}`, items: [item], startedAt: first, endedAt: last });
    }
  }
  return visits;
}

const PHRASES: Record<string, (n: number) => string> = {
  account_created: () => "created an account",
  login: () => "signed in",
  sub_started: () => "started a subscription",
  sub_changed: () => "changed their subscription",
  sub_ended: () => "subscription ended",
  song_created: (n) => (n === 1 ? "made a song" : `made ${n} songs`),
  song_imported: (n) => (n === 1 ? "imported a song" : `imported ${n} songs`),
  song_edited: (n) => (n === 1 ? "edited a song" : `edited ${n} songs`),
  song_opened: (n) => (n === 1 ? "opened a song" : `opened ${n} songs`),
  chord_added: () => "placed chords",
  style_changed: () => "changed the look",
  ai_styled: (n) => (n === 1 ? "used AI text style" : `used AI text style ${n} times`),
  bg_generated: (n) => (n === 1 ? "made an AI picture" : `made ${n} AI pictures`),
  pdf_exported: (n) => (n === 1 ? "exported a PDF" : `exported ${n} PDFs`),
  share_created: (n) => (n === 1 ? "made a share link" : `made ${n} share links`),
  marketing_email: (n) => (n === 1 ? "was sent an email" : `was sent ${n} emails`),
};
// What matters most first; the summary names the top few.
const ORDER = [
  "sub_ended", "sub_started", "sub_changed", "account_created", "song_created", "song_imported",
  "share_created", "bg_generated", "ai_styled", "pdf_exported", "style_changed", "song_edited", "chord_added",
  "song_opened", "marketing_email", "login",
];

/** "made 2 songs, made an AI picture, edited a song" */
export function visitSummary(visit: Visit): string {
  const counts = new Map<string, number>();
  for (const it of visit.items) counts.set(it.type, (counts.get(it.type) ?? 0) + 1);
  const parts = ORDER.filter((t) => counts.has(t)).map((t) => PHRASES[t](counts.get(t)!));
  for (const [t, n] of counts) if (!ORDER.includes(t)) parts.push(`${TYPES[t]?.label ?? t}${n > 1 ? ` ×${n}` : ""}`);
  const shown = parts.slice(0, 4);
  return shown.join(", ") + (parts.length > 4 ? ` and ${parts.length - 4} more` : "");
}

/** "12 min", "1 h 5 min"; empty for a visit that is a single moment. */
export function visitLength(visit: Visit): string {
  const min = Math.round((visit.endedAt - visit.startedAt) / 60_000);
  if (min < 1) return "";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** The song titles a visit touched, without repeats. */
export function visitTitles(visit: Visit): string[] {
  const seen = new Set<string>();
  for (const it of visit.items) {
    const t = it.meta?.title;
    if (typeof t === "string" && t.trim()) seen.add(t.trim());
  }
  return [...seen];
}
