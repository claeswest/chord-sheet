// Collections — the folders a recipe book is organised into.
//
// Every function takes the signed-in user's id and scopes by it, the same
// property recipeDb keeps: there is no path here that reads or writes a
// collection without an owner check.
//
// Flat for now. The schema has parentId and a self-relation for nesting, but
// nothing here uses it — a recipe book with sub-folders before it has twenty
// recipes is a filing system nobody asked for. The column stays so nesting
// needs no migration when there is a reason for it.

import { prisma } from "./prisma";

const NOT_FOUND = "P2025";

function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === NOT_FOUND;
}

export type CollectionListItem = {
  id: string;
  name: string;
  count: number;
};

/** Every collection the user has, with how many recipes are in each. */
export async function listCollections(userId: string): Promise<CollectionListItem[]> {
  const rows = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, _count: { select: { recipes: true } } },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, count: c._count.recipes }));
}

/** The ids a single recipe belongs to — for ticking boxes in the editor. */
export async function collectionIdsForRecipe(
  userId: string,
  recipeId: string,
): Promise<string[]> {
  const rows = await prisma.recipeCategory.findMany({
    // Scoped through both sides: the recipe must be the user's AND the
    // collection must be. Either alone would let a guessed id through.
    where: { recipeId, recipe: { userId }, category: { userId } },
    select: { categoryId: true },
  });
  return rows.map((r) => r.categoryId);
}

export async function createCollection(userId: string, name: string) {
  return prisma.category.create({ data: { userId, name } });
}

export async function renameCollection(
  userId: string,
  id: string,
  name: string,
): Promise<boolean> {
  try {
    // Extended where-unique, as everywhere else here: the ownership check is
    // part of the same statement, because the HTTP driver can't run a
    // transaction to do it in two.
    await prisma.category.update({ where: { id, userId }, data: { name } });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

/** Removes the collection. The recipes in it are untouched — only the filing. */
export async function deleteCollection(userId: string, id: string): Promise<boolean> {
  try {
    await prisma.category.delete({ where: { id, userId } });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

/**
 * Sets exactly which collections a recipe is in.
 *
 * deleteMany then create, not a transaction — the Neon HTTP driver has none.
 * A crash between the two leaves the recipe in fewer collections than intended,
 * which is recoverable by ticking the box again; the opposite order could
 * duplicate rows against the composite primary key and fail outright.
 */
export async function setRecipeCollections(
  userId: string,
  recipeId: string,
  categoryIds: string[],
): Promise<boolean> {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId } });
  if (!recipe) return false;

  // Only ids this user actually owns. Anything else is silently dropped rather
  // than erroring: the caller is a checkbox list, and a stale id means the
  // collection was deleted in another tab.
  const owned = await prisma.category.findMany({
    where: { userId, id: { in: categoryIds } },
    select: { id: true },
  });

  await prisma.recipeCategory.deleteMany({ where: { recipeId } });
  for (const c of owned) {
    await prisma.recipeCategory.create({ data: { recipeId, categoryId: c.id } });
  }
  return true;
}
