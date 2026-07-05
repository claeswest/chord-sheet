import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity, logActivityThrottled, type ActivityType } from "@/lib/activity";

// Beacon for client-side events. Whitelisted types only; requires a session
// (guest events are silently ignored). chord_added is throttled per song.
const CLIENT_TYPES = new Set(["chord_added", "pdf_exported", "song_imported"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: true }); // guests: no-op

  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  if (!CLIENT_TYPES.has(type)) {
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }

  const songId = typeof body.songId === "string" ? body.songId : undefined;
  const meta: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title) meta.title = body.title.slice(0, 200);
  if (typeof body.source === "string" && body.source) meta.source = body.source.slice(0, 50);

  if (type === "chord_added" && songId) {
    await logActivityThrottled(type, session.user.id, songId, meta);
  } else {
    await logActivity(type as ActivityType, session.user.id, songId ? { songId, ...meta } : meta);
  }
  return NextResponse.json({ ok: true });
}
