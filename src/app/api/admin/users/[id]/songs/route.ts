import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Admin-only: full list of a user's songs (metadata only — content is fetched
// per-song via /api/admin/songs/[id]). Used when a user row is expanded so the
// list stays light by default but can show everything on demand.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const songs = await prisma.song.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, artist: true, createdAt: true },
  });

  return NextResponse.json({ songs });
}
