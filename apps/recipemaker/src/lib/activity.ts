// Activity log — one row per notable event, read by /admin later.
//
// Deliberately a near-copy of ChordSheetMaker's. Duplication is the plan for
// now: extract to packages/core once both apps have shown what actually
// repeats, rather than guessing the shared shape from one implementation.

import { prisma } from "./prisma";

export async function logActivity(
  type: string,
  userId?: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { type, userId: userId ?? null, meta: meta ? (meta as object) : undefined },
    });
  } catch {
    // Never let logging break a request.
  }
}
