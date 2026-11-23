import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, logActivityThrottled } from "@/lib/activity";

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

  await logActivityThrottled("song_opened", session.user.id, id, { title: song.title });

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

  // The title is read first: once the song is gone, the log is the only
  // place that says which one it was.
  const song = await prisma.song.findFirst({
    where: { id, userId: session.user.id },
    select: { title: true },
  });

  // Only delete if it belongs to the user
  await prisma.song.deleteMany({
    where: { id, userId: session.user.id },
  });

  // The editor also asks for songs that were never saved to be removed;
  // those were never here, so there is nothing to record.
  if (song) await logActivity("song_deleted", session.user.id, { songId: id, title: song.title });

  return NextResponse.json({ ok: true });
}
