import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listRecipes, createRecipe, countRecipes } from "@/lib/recipeDb";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ recipes: await listRecipes(session.user.id) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Free-tier limit enforced server-side, not just in the UI.
  const limit = PLANS[planFromUser(user) as Plan].features.recipeLimit;
  if (typeof limit === "number" && (await countRecipes(user.id)) >= limit) {
    return NextResponse.json(
      { error: "limit_reached", limit },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const recipe = await createRecipe(user.id, { title: body.title });
  return NextResponse.json({ recipe }, { status: 201 });
}
