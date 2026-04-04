import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/share — save a full song snapshot (no auth required)
// Returns { token } which maps to /share/[token]
export async function POST(req: NextRequest) {
  const { title, artist, lines, style } = await req.json();

  if (!lines) {
    return NextResponse.json({ error: "Missing song content" }, { status: 400 });
  }

  const share = await prisma.share.create({
    data: {
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, style: style ?? null },
    },
  });

  return NextResponse.json({ token: share.id });
}
