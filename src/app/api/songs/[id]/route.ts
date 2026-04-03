import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/songs/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const song = await prisma.song.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, title: true, artist: true, content: true, updatedAt: true },
  });

  if (!song) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(song);
}

// DELETE /api/songs/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only delete if it belongs to the user
  await prisma.song.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
