import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/share/[token] — public, no auth
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { id: token } });

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  return NextResponse.json(share);
}
