import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import type { RecipeContent } from "@/types/recipe";

type Ctx = { params: Promise<{ id: string }> };

// PUT    /api/recipes/[id]/image — store a picture the browser has compressed
// DELETE /api/recipes/[id]/image — remove one
//
// Separate from the editor's save on purpose. Pictures are large, the editor
// posts the whole content object, and a save from a tab opened before the
// picture existed would otherwise wipe it. This route reads the current
// content and merges, so it never overwrites anything it didn't mean to.

/** Refuse anything the browser plainly failed to compress. */
const MAX_CHARS = 1_200_000; // ~900 KB of image

function isDataUrl(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/") && v.length < MAX_CHARS;
}

async function loadContent(id: string, userId: string) {
  const row = await prisma.recipe.findFirst({
    where: { id, userId },
    select: { content: true },
  });
  return row ? ((row.content as Partial<RecipeContent>) ?? {}) : null;
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const stepId = typeof body.stepId === "string" ? body.stepId : null;

  const content = await loadContent(id, session.user.id);
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stepId) {
    if (!isDataUrl(body.full)) {
      return NextResponse.json({ error: "That image is too large or malformed." }, { status: 400 });
    }
    const groups = (content.stepGroups ?? []).map((g) => ({
      ...g,
      items: (g.items ?? []).map((s) => (s.id === stepId ? { ...s, imageUrl: body.full } : s)),
    }));
    const found = groups.some((g) => g.items.some((s) => s.id === stepId));
    if (!found) return NextResponse.json({ error: "That step is no longer there." }, { status: 404 });

    await prisma.recipe.update({
      where: { id, userId: session.user.id },
      data: { content: { ...content, stepGroups: groups } as object },
    });
  } else {
    if (!isDataUrl(body.full) || !isDataUrl(body.thumb)) {
      return NextResponse.json({ error: "That image is too large or malformed." }, { status: 400 });
    }
    await prisma.recipe.update({
      where: { id, userId: session.user.id },
      data: {
        imageUrl: body.thumb,
        content: { ...content, heroImage: body.full } as object,
      },
    });
  }

  await logActivity("recipe_image_saved", session.user.id, { recipeId: id, step: Boolean(stepId) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const stepId = typeof body.stepId === "string" ? body.stepId : null;

  const content = await loadContent(id, session.user.id);
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stepId) {
    const groups = (content.stepGroups ?? []).map((g) => ({
      ...g,
      items: (g.items ?? []).map(({ imageUrl, ...s }) => (s.id === stepId ? s : { ...s, imageUrl })),
    }));
    await prisma.recipe.update({
      where: { id, userId: session.user.id },
      data: { content: { ...content, stepGroups: groups } as object },
    });
  } else {
    const { heroImage, ...rest } = content;
    void heroImage;
    await prisma.recipe.update({
      where: { id, userId: session.user.id },
      data: { imageUrl: null, content: rest as object },
    });
  }

  return NextResponse.json({ ok: true });
}
