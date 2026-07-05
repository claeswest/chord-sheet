import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { sendUpgradeNudge, type SendResult } from "@/lib/marketing";

// Admin-only: send the upgrade-nudge email to the given users.
// sendUpgradeNudge itself enforces opt-out and the 7-day resend guard.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.slice(0, 100) : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }

  const results: Record<string, SendResult> = {};
  for (const id of userIds) {
    results[id] = await sendUpgradeNudge(String(id));
  }

  const sent = Object.values(results).filter((r) => r === "sent").length;
  return NextResponse.json({ sent, results });
}
