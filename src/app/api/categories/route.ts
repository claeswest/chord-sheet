import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: { songs: { select: { songId: true, order: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json(categories.map((c) => ({
    id: c.id,
    name: c.name,
    order: c.order,
    parentId: c.parentId ?? null,
    songIds: c.songs.map((s) => s.songId),
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, parentId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const category = await prisma.category.create({
    data: { userId: session.user.id, name: name.trim(), parentId: parentId ?? null },
  });

  return NextResponse.json({
    id: category.id,
    name: category.name,
    order: category.order,
    parentId: category.parentId ?? null,
    songIds: [],
  });
}
