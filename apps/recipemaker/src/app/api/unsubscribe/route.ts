import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@clavos/core/unsubscribe";

// RFC 8058 one-click unsubscribe target, named in the List-Unsubscribe header.
// Gmail and Yahoo POST here without rendering anything and judge the sender on
// whether it works. The footer link goes to the page instead, for humans.
export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const u = sp.get("u");
  const t = sp.get("t");

  if (u && t && verifyUnsubscribeToken(u, t)) {
    try {
      await prisma.user.update({ where: { id: u }, data: { marketingOptOut: true } });
    } catch {
      /* account gone — nothing left to unsubscribe */
    }
  }

  // Always 200. Mail providers read anything else as a broken unsubscribe,
  // which counts against the domain far more than one failed opt-out does.
  return NextResponse.json({ ok: true });
}
