import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  sendMarketingEmail,
  MARKETING_TEMPLATES,
  type MarketingTemplate,
  type SendResult,
} from "@/lib/marketing";

// Admin-only: send a marketing email (by template) to the given users.
// sendMarketingEmail itself enforces opt-out and the 7-day resend guard.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.slice(0, 100) : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }
  const template: MarketingTemplate =
    MARKETING_TEMPLATES.includes(body.template) ? body.template : "upgrade_nudge";

  const results: Record<string, SendResult> = {};
  for (const id of userIds) {
    results[id] = await sendMarketingEmail(String(id), template);
  }

  const sent = Object.values(results).filter((r) => r === "sent").length;
  return NextResponse.json({ sent, results });
}
