import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/songs/[id]/background — save background image separately (avoids large POST body)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { backgroundImage } = await req.json();

  // Fetch existing content so we can merge (preserve other fields)
  const existing = await prisma.song.findFirst({
    where: { id, userId: session.user.id },
    select: { content: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = (existing.content as Record<string, unknown>) ?? {};
  const style = (content.style as Record<string, unknown>) ?? {};

  const updatedContent = {
    ...content,
    style: {
      ...style,
      backgroundImage: backgroundImage ?? null,
    },
  };

  await prisma.song.updateMany({
    where: { id, userId: session.user.id },
    data: { content: updatedContent, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
