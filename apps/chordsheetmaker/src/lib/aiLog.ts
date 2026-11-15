// A record of every AI request, whoever made it.
//
// Until November 2026 only signed-in users were logged, and only for styling
// and pictures. Most songs are made by visitors without an account, so the
// admin could not say how much the AI features were used, or what they cost.
//
// A visitor has no account to log against. The browser sends the same random
// per-browser id the activity beacon uses (analytics.ts), in an `x-anon`
// header, where the calling code has been taught to; otherwise "unknown".

import { auth } from "./auth";
import { logActivity, type ActivityType } from "./activity";

/** The account behind a request, or the visitor's per-browser id when there is none. */
export async function aiActor(req: Request): Promise<{ userId: string | null; guest?: string }> {
  const session = await auth().catch(() => null);
  if (session?.user?.id) return { userId: session.user.id };
  const anon = req.headers.get("x-anon")?.trim().slice(0, 16);
  return { userId: null, guest: anon || "unknown" };
}

/** Log one AI event for whoever asked. Never throws: logging must not break the request. */
export async function logAi(req: Request, type: ActivityType, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    const actor = await aiActor(req);
    await logActivity(type, actor.userId, actor.userId ? meta : { ...meta, guest: actor.guest });
  } catch {
    /* never break the caller */
  }
}
