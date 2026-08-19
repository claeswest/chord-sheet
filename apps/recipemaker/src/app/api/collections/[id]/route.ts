import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCollection, renameCollection } from "@/lib/categoryDb";

type Ctx = { params: Promise<{ id: string }> };

// PATCH  /api/collections/[id] — rename
// DELETE /api/collections/[id] — remove the collection, not the recipes

const MAX_NAME = 60;

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `Give it a name, up to ${MAX_NAME} characters.` },
      { status: 400 },
    );
  }

  const ok = await renameCollection(session.user.id, id, name);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // The recipes survive — RecipeCategory cascades, Recipe doesn't. Deleting a
  // shelf must never delete the books on it, and that distinction is the whole
  // reason this isn't behind a confirmation as heavy as recipe deletion.
  const ok = await deleteCollection(session.user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
