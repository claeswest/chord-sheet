import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, isRecordNotFound } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // update(), not updateMany() — see isRecordNotFound in lib/prisma. The userId
  // stays in the filter, so this is still scoped to the owner.
  try {
    await prisma.category.update({
      where: { id, userId: session.user.id },
      data: { name: name.trim() },
    });
  } catch (e) {
    if (isRecordNotFound(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.category.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
