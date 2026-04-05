import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/songs — list all songs for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const songs = await prisma.song.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      artist: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      categories: { select: { categoryId: true } },
    },
  });

  return NextResponse.json(songs.map((s) => ({
    ...s,
    categoryIds: s.categories.map((c) => c.categoryId),
  })));
}

// POST /api/songs — create or upsert a song
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, artist, lines, tags, style } = body;

  // Strip backgroundImage from incoming style — it's saved separately via
  // PUT /api/songs/[id]/background to avoid large request bodies.
  // Preserve the existing backgroundImage already stored in the DB.
  const { backgroundImage: _dropped, ...styleWithoutBg } = (style ?? {}) as Record<string, unknown>;

  // For updates, fetch the existing backgroundImage so we don't wipe it.
  let existingBgImage: string | null = null;
  if (id) {
    const existing = await prisma.song.findFirst({
      where: { id, userId: session.user.id },
      select: { content: true },
    });
    existingBgImage = (existing?.content as any)?.style?.backgroundImage ?? null;
  }

  const mergedStyle = existingBgImage
    ? { ...styleWithoutBg, backgroundImage: existingBgImage }
    : styleWithoutBg;

  const song = await prisma.song.upsert({
    where: { id: id ?? "__new__" },
    update: {
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, tags: tags ?? [], style: mergedStyle as any },
      updatedAt: new Date(),
    },
    create: {
      id,
      userId: session.user.id,
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, tags: tags ?? [], style: styleWithoutBg as any },
    },
  });

  return NextResponse.json(song);
}
