import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Admin-only: fetch a single song's full content so it can be previewed in the
// admin dashboard. Unlike the regular /api/songs route this is not scoped to the
// owner — admins can view any user's song.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const song = await prisma.song.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      artist: true,
      key: true,
      capo: true,
      tempo: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ song });
}
