import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Add song to category
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: categoryId } = await params;
  const { songId } = await req.json();

  // Verify ownership
  const [category, song] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, userId: session.user.id } }),
    prisma.song.findFirst({ where: { id: songId, userId: session.user.id } }),
  ]);
  if (!category || !song) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.songCategory.createMany({
      data: [{ songId, categoryId }],
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("songCategory.createMany error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Remove song from category
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: categoryId } = await params;
  const { songId } = await req.json();

  await prisma.songCategory.deleteMany({ where: { songId, categoryId } });
  return NextResponse.json({ ok: true });
}
