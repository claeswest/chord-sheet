import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCollection, listCollections } from "@/lib/categoryDb";

// GET  /api/collections — the user's collections, with recipe counts
// POST /api/collections — create one

/** Long enough for "Christmas baking", short enough to fit a filter chip. */
const MAX_NAME = 60;

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim().replace(/\s+/g, " ");
  return name.length === 0 || name.length > MAX_NAME ? null : name;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ collections: await listCollections(session.user.id) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: `Give it a name, up to ${MAX_NAME} characters.` },
      { status: 400 },
    );
  }

  // Duplicate names are allowed. Two collections called "Baking" is a mess the
  // owner made and can rename their way out of; refusing it would be the app
  // deciding how someone files their own recipes.
  const created = await createCollection(session.user.id, name);
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
}
