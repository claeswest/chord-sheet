import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity, logActivityThrottled, type ActivityType } from "@/lib/activity";

// Beacon for client-side events. Whitelisted types only.
// Logged-in users: CLIENT_TYPES. Guests (no session): GUEST_TYPES, logged with
// userId=null and a per-browser id in meta.guest so their funnel is visible in
// /admin/activity. Noisy types are throttled per song (30 min).
const CLIENT_TYPES = new Set(["chord_added", "pdf_exported", "song_imported", "style_changed"]);
const GUEST_TYPES = new Set([
  "song_created", "song_edited", "chord_added", "pdf_exported", "song_imported", "style_changed",
]);
const THROTTLED_TYPES = new Set(["chord_added", "style_changed", "song_edited"]);

export async function POST(req: Request) {
  const session = await auth();

  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");

  const songId = typeof body.songId === "string" ? body.songId : undefined;
  const meta: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title) meta.title = body.title.slice(0, 200);
  if (typeof body.source === "string" && body.source) meta.source = body.source.slice(0, 50);
  if (typeof body.origin === "string" && body.origin) meta.origin = body.origin.slice(0, 30);

  if (!session?.user?.id) {
    // Guest event — unknown types are dropped silently (no 400: nothing a
    // guest sends is worth an error, and this endpoint is unauthenticated).
    if (!GUEST_TYPES.has(type)) return NextResponse.json({ ok: true });
    meta.guest = typeof body.anon === "string" && body.anon ? body.anon.slice(0, 16) : "unknown";
    if (THROTTLED_TYPES.has(type) && songId) {
      await logActivityThrottled(type as ActivityType, null, songId, meta);
    } else {
      await logActivity(type as ActivityType, null, songId ? { songId, ...meta } : meta);
    }
    return NextResponse.json({ ok: true });
  }

  if (!CLIENT_TYPES.has(type)) {
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }

  if (THROTTLED_TYPES.has(type) && songId) {
    await logActivityThrottled(type as ActivityType, session.user.id, songId, meta);
  } else {
    await logActivity(type as ActivityType, session.user.id, songId ? { songId, ...meta } : meta);
  }
  return NextResponse.json({ ok: true });
}
