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
 * Log at most once per (type, user, songId) per 30 minutes — for noisy events
 * like song_opened / song_edited / chord_added, so one editing session is one
 * row instead of hundreds.
 */
export async function logActivityThrottled(
  type: ActivityType,
  userId: string,
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
      select: { id: true },
    });
    if (recent) return;
    await logActivity(type, userId, { songId, ...meta });
  } catch {
    /* never break the caller */
  }
}
