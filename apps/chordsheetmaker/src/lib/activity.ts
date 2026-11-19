// Activity log — one row per notable event, shown in /admin/activity.
// Logging must never break the action that triggered it: both helpers
// swallow all errors.

import { headers } from "next/headers";
import { prisma } from "./prisma";

export type ActivityType =
  | "account_created"
  | "login"
  | "sub_started"
  | "sub_changed"
  | "sub_ended"
  | "song_created"
  | "song_opened"
  | "song_edited"
  | "chord_added"
  | "pdf_exported"
  | "song_imported"
  | "bg_generated"
  | "ai_styled"
  | "style_changed"
  | "marketing_email"
  | "share_created" // a share link was made: meta.songId, meta.token
  | "app_connected" // an AI app was allowed to use the songs: meta.app
  // Bookkeeping rather than something a person did. Hidden from the admin
  // feed unless asked for; the dashboard counts them.
  | "ai_call"   // an import the AI read: meta.kind = search | paste | photo
  | "job_run";  // a scheduled job finished: meta.job, and what it did

/**
 * Events that are logged by the person's own request, so that request's
 * country is theirs. The rest are logged by someone else's — Stripe's webhook,
 * the daily job, the admin sending an email — and would record a data centre
 * or the founder's kitchen.
 */
const FROM_THE_PERSON = new Set<ActivityType>([
  "account_created", "login", "song_created", "song_opened", "song_edited", "chord_added",
  "pdf_exported", "song_imported", "bg_generated", "ai_styled", "style_changed", "share_created", "ai_call",
  "app_connected",
]);

/**
 * The country the current request came from, as two letters ("SE"), or null.
 * The hosting platform works it out from the visitor's address and sends it
 * in a header; the address itself is never read or stored here. Outside a
 * request, and on a developer's machine, there is no such header.
 */
async function requestCountry(): Promise<string | null> {
  try {
    const code = (await headers()).get("x-vercel-ip-country");
    return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
  } catch {
    return null;
  }
}

export async function logActivity(
  type: ActivityType,
  userId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const country = FROM_THE_PERSON.has(type) ? await requestCountry() : null;
    const withCountry = country ? { ...meta, country } : meta;
    await prisma.activityLog.create({
      data: { type, userId: userId ?? null, meta: (withCountry ?? undefined) as never },
    });
  } catch {
    /* never break the caller */
  }
}

const THROTTLE_MS = 30 * 60 * 1000;

/**
 * One row per (type, user, songId) per 30 minutes — for noisy events like
 * song_opened / song_edited / chord_added, so one editing session is one row
 * instead of hundreds. Repeats within the window aren't dropped: they bump
 * meta.count and append to meta.times, so the admin feed can expand them.
 */
export async function logActivityThrottled(
  type: ActivityType,
  userId: string | null, // null = guest event (song ids are per-browser unique)
  songId: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const recent = await prisma.activityLog.findFirst({
      where: {
        type,
        userId,
        createdAt: { gte: new Date(Date.now() - THROTTLE_MS) },
        meta: { path: ["songId"], equals: songId },
      },
      select: { id: true, meta: true },
    });
    if (recent) {
      const m = (recent.meta ?? {}) as Record<string, unknown>;
      const times = Array.isArray(m.times) ? (m.times as string[]) : [];
      if (times.length < 200) times.push(new Date().toISOString());
      await prisma.activityLog.update({
        where: { id: recent.id },
        data: {
          meta: {
            ...m,
            count: (typeof m.count === "number" ? m.count : 1) + 1,
            times,
          } as never,
        },
      });
      return;
    }
    await logActivity(type, userId, { songId, ...meta });
  } catch {
    /* never break the caller */
  }
}
