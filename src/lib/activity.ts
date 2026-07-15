// Activity log — one row per notable event, shown in /admin/activity.
// Logging must never break the action that triggered it: both helpers
// swallow all errors.

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
  | "marketing_email";

export async function logActivity(
  type: ActivityType,
  userId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { type, userId: userId ?? null, meta: (meta ?? undefined) as never },
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
