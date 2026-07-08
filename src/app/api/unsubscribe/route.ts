import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/marketing";

// RFC 8058 one-click unsubscribe target for the List-Unsubscribe header.
// Gmail/Yahoo POST here without rendering anything — must succeed silently.
// The human-facing footer link still goes to the /unsubscribe page.
export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const u = sp.get("u");
  const t = sp.get("t");
  if (u && t && verifyUnsubscribeToken(u, t)) {
    try {
      await prisma.user.update({ where: { id: u }, data: { marketingOptOut: true } });
    } catch {
      /* user gone — nothing to unsubscribe */
    }
  }
  // Always 200: mail providers treat non-2xx as a broken unsubscribe
  return NextResponse.json({ ok: true });
}
