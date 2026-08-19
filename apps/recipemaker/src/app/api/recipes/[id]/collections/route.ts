import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRecipeCollections } from "@/lib/categoryDb";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/recipes/[id]/collections — set exactly which collections it's in.
//
// A whole-set write rather than add/remove calls: the editor shows a list of
// checkboxes, so the client already knows the complete answer, and sending it
// as one means two boxes ticked quickly can't race each other into a half
// state.

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.collectionIds)
    ? body.collectionIds.filter((v: unknown): v is string => typeof v === "string")
    : null;
  if (!ids) {
    return NextResponse.json({ error: "collectionIds must be a list." }, { status: 400 });
  }

  const ok = await setRecipeCollections(session.user.id, id, ids);
  if (!ok) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
