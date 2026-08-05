// Server-side recipe access. Every function takes the signed-in user's id and
// scopes by it — there is no path here that reads a recipe without an owner
// check, which is the property worth preserving as this file grows.

import { prisma } from "./prisma";
import { emptyContent, type RecipeContent } from "@/types/recipe";

export type RecipeListItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  updatedAt: Date;
};

export async function listRecipes(userId: string): Promise<RecipeListItem[]> {
  return prisma.recipe.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      servings: true,
      prepMinutes: true,
      cookMinutes: true,
      updatedAt: true,
    },
  });
}

export async function getRecipe(userId: string, id: string) {
  // findFirst, not findUnique — the userId in the filter is the ownership check.
  return prisma.recipe.findFirst({ where: { id, userId } });
}

export async function createRecipe(
  userId: string,
  data: { title: string; content?: RecipeContent },
) {
  return prisma.recipe.create({
    data: {
      userId,
      title: data.title.trim() || "Untitled recipe",
      content: (data.content ?? emptyContent()) as object,
    },
  });
}

export async function updateRecipe(
  userId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    imageUrl: string | null;
    servings: number | null;
    prepMinutes: number | null;
    cookMinutes: number | null;
    source: string | null;
    content: RecipeContent;
  }>,
) {
  // updateMany so the userId filter applies — update() would only match on id.
  const res = await prisma.recipe.updateMany({
    where: { id, userId },
    data: { ...data, content: data.content as object | undefined },
  });
  return res.count > 0;
}

export async function deleteRecipe(userId: string, id: string): Promise<boolean> {
  const res = await prisma.recipe.deleteMany({ where: { id, userId } });
  return res.count > 0;
}

export async function countRecipes(userId: string): Promise<number> {
  return prisma.recipe.count({ where: { userId } });
}
