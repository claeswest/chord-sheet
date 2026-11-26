// How /admin words things: dates, billing, and the events in the activity log.
//
// In one file because the same event is described on three pages — the feed,
// a person's timeline, and beside their recipes — and three wordings for one
// event is how an admin panel starts to lie.

import { cancellationPending } from "@clavos/core/billing";

export const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const when = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** "3 days ago". Past a month the date itself says more than a count does. */
export function ago(d: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  return day(d);
}

/** What a row's billing actually means, in words rather than four columns. */
export function billingLabel(u: {
  plan: string;
  status: string | null;
  cancelAt: Date | null;
  periodEnd: Date | null;
}): string {
  if (u.plan === "free") return "Free";
  if (cancellationPending(u.cancelAt)) return `Leaving ${day(u.cancelAt!)}`;
  if (u.status === "trialing") return `Trial to ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  if (u.status === "active") return `Paying · renews ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  if (u.status === "past_due" || u.status === "unpaid") return "Payment failed";
  return u.status ?? u.plan;
}

/** Reads better than the raw event name. */
export const EVENT_LABELS: Record<string, string> = {
  account_created: "Signed up",
  login: "Signed in",
  tried_import: "Tried the paste box",
  claimed_try: "Kept the recipe they tried",
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
  email_trial_tips: "Was sent the trial tips",
  email_trial_ending: "Was sent the trial-ending notice",
};

export const eventLabel = (type: string) => EVENT_LABELS[type] ?? type;

/** Where an import's text came from, as the import route records it. */
export function importSource(from: unknown): string {
  if (from === "photo") return "from a photo";
  if (from === "url_structured" || from === "url_page") return "from a web page";
  return "from text";
}

/** The one-line summary worth showing beside an event. */
export function eventDetail(type: string, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  if (type === "recipe_imported") {
    return [importSource(m.from), m.title].filter(Boolean).join(" · ");
  }
  if (type === "claimed_try" || type === "tried_import") {
    return typeof m.title === "string" ? m.title : "";
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
