import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planFromUser, getSongLimit } from "@/lib/plans";
import { notifyAdmin } from "@/lib/notify";
import { logActivity, logActivityThrottled } from "@/lib/activity";

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

  try {
    // Use raw SQL to avoid any Prisma client cache issues with the new `order` column
    for (let idx = 0; idx < songIds.length; idx++) {
      await prisma.$executeRaw`
        UPDATE "Song" SET "order" = ${idx}
        WHERE id = ${songIds[idx]} AND "userId" = ${userId}
      `;
    }
  } catch (err) {
    console.error("PUT /api/songs order error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/songs — create or upsert a song
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, artist, lines, tags, style, semitones } = body;

  // Check if this is a new song (no existing record for this id + user)
  const existing = id
    ? await prisma.song.findFirst({ where: { id, userId: session.user.id }, select: { id: true } })
    : null;

  if (!existing) {
    // New song — enforce plan limit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true },
    });
    const plan = planFromUser(user ?? {});
    const limit = getSongLimit(plan);
    if (limit !== null) {
      const count = await prisma.song.count({ where: { userId: session.user.id } });
      if (count >= limit) {
        return NextResponse.json({ error: "limit_reached" }, { status: 403 });
      }
    }
  }

  const data = {
    title: title ?? "Untitled Song",
    artist: artist ?? "",
    content: { lines, tags: tags ?? [], style: style ?? null, semitones: semitones ?? 0 },
  };

  let song;
  if (existing) {
    // Ownership verified above — safe to update by id.
    song = await prisma.song.update({
      where: { id: existing.id },
      data: { ...data, updatedAt: new Date() },
    });
  } else {
    // Create-only path: if the id already exists (i.e. belongs to another
    // user), the unique constraint rejects it instead of overwriting theirs.
    try {
      song = await prisma.song.create({
        data: { id, userId: session.user.id, ...data },
      });
    } catch {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
  }

  if (existing) {
    // Autosaves are frequent — one song_edited row per song per 30 min.
    await logActivityThrottled("song_edited", session.user.id, song.id, { title: song.title });
  }

  // Notify on a genuinely new song (not on every autosave — those hit `update`).
  if (!existing) {
    await logActivity("song_created", session.user.id, { songId: song.id, title: song.title });
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const who = u?.name || u?.email || "A user";
    await notifyAdmin("🎵 New song created", [
      `${who} (${u?.email ?? "?"}) created a song: "${song.title || "Untitled Song"}"${song.artist ? ` — ${song.artist}` : ""}.`,
    ]);
  }

  return NextResponse.json(song);
}
