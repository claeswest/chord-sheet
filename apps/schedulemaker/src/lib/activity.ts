// Activity log — one row per notable thing an account does.
//
// A near-copy of the other two apps'. It is also the first counting this app
// has ever had: until accounts, nothing recorded whether anyone used it.
//
// What goes in `meta` is numbers and labels, never what is on a schedule. A
// row that says "saved, 43 lessons" is a statistic; a row that says whose
// class it was is a second copy of the thing people are trusting us to keep
// in one place and delete on request.

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
