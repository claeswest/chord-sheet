// Server-side recipe access. Every function takes the signed-in user's id and
// scopes by it — there is no path here that reads a recipe without an owner
// check, which is the property worth preserving as this file grows.

import { prisma } from "./prisma";
import { emptyContent, type RecipeContent } from "@/types/recipe";
import type { CanvasStyle } from "@/lib/canvasStyle";

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

export async function listRecipes(
  userId: string,
  /** Narrow to one collection. Omitted means the whole book. */
  collectionId?: string,
): Promise<RecipeListItem[]> {
  return prisma.recipe.findMany({
    where: {
      userId,
      // Filtering through the join rather than fetching ids first: one query,
      // and the collection is checked against the same user in the same
      // statement, so a guessed id returns nothing rather than someone else's
      // shelf.
      ...(collectionId
        ? { categories: { some: { categoryId: collectionId, category: { userId } } } }
        : {}),
    },
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

// Ownership stays in the WHERE clause, but via update()/delete() with an extra
// non-unique filter rather than updateMany()/deleteMany().
//
// This is not a style preference. The Neon HTTP driver cannot run transactions,
// and Prisma compiles updateMany into a transaction — so updateMany throws
// "Transactions are not supported in HTTP mode" at runtime. update() with
// `where: { id, userId }` is a single statement, keeps the ownership check
// atomic, and throws P2025 when nothing matches.
const NOT_FOUND = "P2025";

function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === NOT_FOUND;
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
): Promise<boolean> {
  try {
    // Pictures are written by their own route and are large, so the editor
    // leaves them out of what it sends. Put them back before writing, or every
    // save would silently delete them — and a save is the one action a user is
    // certain cannot lose anything.
    let content = data.content;
    if (content) content = await keepImages(id, userId, content);

    await prisma.recipe.update({
      where: { id, userId },
      data: { ...data, content: content as object | undefined },
    });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

/** Carries existing images across a content write that doesn't mention them. */
async function keepImages(
  id: string,
  userId: string,
  incoming: RecipeContent,
): Promise<RecipeContent> {
  const row = await prisma.recipe.findFirst({
    where: { id, userId },
    select: { content: true },
  });
  const old = (row?.content as Partial<RecipeContent> | null) ?? null;
  if (!old) return incoming;

  const oldStepImages = new Map<string, string>();
  for (const g of old.stepGroups ?? []) {
    for (const s of g.items ?? []) {
      if (s.imageUrl) oldStepImages.set(s.id, s.imageUrl);
    }
  }

  return {
    ...incoming,
    heroImage: incoming.heroImage ?? old.heroImage,
    stepGroups: incoming.stepGroups.map((g) => ({
      ...g,
      items: g.items.map((s) =>
        s.imageUrl ? s : oldStepImages.has(s.id) ? { ...s, imageUrl: oldStepImages.get(s.id) } : s,
      ),
    })),
  };
}

/**
 * The canvas style is its own write: it is set by the style generator rather
 * than the editor, and it must not ride along with a content save that could
 * overwrite it.
 */
export async function setRecipeStyle(
  userId: string,
  id: string,
  style: CanvasStyle,
): Promise<boolean> {
  try {
    await prisma.recipe.update({ where: { id, userId }, data: { style: style as object } });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

export async function deleteRecipe(userId: string, id: string): Promise<boolean> {
  try {
    await prisma.recipe.delete({ where: { id, userId } });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

export async function countRecipes(userId: string): Promise<number> {
  return prisma.recipe.count({ where: { userId } });
}
