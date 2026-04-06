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
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      artist: true,
      content: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      categories: { select: { categoryId: true } },
    },
  });

  return NextResponse.json(songs.map((s) => {
    // Strip backgroundImage from list responses — it's large (150 KB each) and
    // not needed in the library view. Fetched individually when opening a song.
    const content = (s.content as Record<string, unknown>) ?? {};
    const style = content.style as Record<string, unknown> | undefined;
    const safeContent = style
      ? { ...content, style: { ...style, backgroundImage: undefined } }
      : content;
    return {
      ...s,
      content: safeContent,
      categoryIds: s.categories.map((c) => c.categoryId),
    };
  }));
}

// PUT /api/songs — save global sort order: body { songIds: string[] }
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { songIds } = await req.json() as { songIds: string[] };
  if (!Array.isArray(songIds) || songIds.length === 0) {
    return NextResponse.json({ error: "songIds required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Use a transaction so all updates succeed or none do
  await prisma.$transaction(
    songIds.map((id, idx) =>
      prisma.song.updateMany({
        where: { id, userId },
        data: { order: idx },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

// POST /api/songs — create or upsert a song
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, artist, lines, tags, style } = body;

  const song = await prisma.song.upsert({
    where: { id: id ?? "__new__" },
    update: {
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, tags: tags ?? [], style: style ?? null },
      updatedAt: new Date(),
    },
    create: {
      id,
      userId: session.user.id,
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, tags: tags ?? [], style: style ?? null },
    },
  });

  return NextResponse.json(song);
}
