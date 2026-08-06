import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRecipeStyle, getRecipe } from "@/lib/recipeDb";
import { parseStyle, contrast } from "@/lib/canvasStyle";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/recipes/[id]/style — set the look by hand.
//
// Separate from /api/ai/style, which generates one. Everything here goes
// through parseStyle, the same validator the generated styles use: field by
// field, rejecting anything with braces, semicolons or url(), since these
// values are written straight into a style attribute.
//
// Unlike the generator, poor contrast is NOT rejected here. The generator has
// to be held to a standard because nobody chose its colours; a person choosing
// their own is entitled to a bad idea. They get told, not overruled.

export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipe = await getRecipe(session.user.id, id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const style = parseStyle(body);
  const ok = await setRecipeStyle(session.user.id, id, style);
  if (!ok) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  // Advisory only — the caller decides what to do with it.
  const inkRatio = contrast(style.ink, style.bg);

  return NextResponse.json({
    style,
    warning:
      inkRatio < 4.5
        ? `The text is only ${inkRatio.toFixed(1)}:1 against the background — hard to read on paper.`
        : null,
  });
}
