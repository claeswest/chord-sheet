// Sharing a recipe by link.
//
// A share is a snapshot: the title and content are copied at the moment you
// share. See the schema comment for why. The practical consequence is that
// re-sharing an edited recipe replaces the old snapshot rather than creating a
// second link, so someone doesn't end up with two URLs showing two versions.

import { prisma } from "./prisma";
import type { RecipeContent } from "@/types/recipe";
import type { CanvasStyle } from "@/lib/canvasStyle";

export type ShareSnapshot = {
  content: RecipeContent;
  style: CanvasStyle | null;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  source: string | null;
};

/**
 * Shares a recipe, replacing any existing share of the same recipe.
 * Returns the share id, which is the public token.
 */
export async function shareRecipe(
  userId: string,
  recipeId: string,
  title: string,
  snapshot: ShareSnapshot,
): Promise<string> {
  // deleteMany, not a transaction: the Neon HTTP driver can't run
  // transactions. A crash between the two statements would leave the recipe
  // simply unshared, which is the safe direction to fail in.
  await prisma.share.deleteMany({ where: { userId, recipeId } });

  const share = await prisma.share.create({
    data: { userId, recipeId, title, content: snapshot as object },
  });
  return share.id;
}

/** The public read. No user scoping — that is the entire point of a share. */
export async function getShare(token: string) {
  return prisma.share.findUnique({ where: { id: token } });
}

/** The share for a recipe, if the owner has one. */
export async function findShareForRecipe(userId: string, recipeId: string) {
  return prisma.share.findFirst({ where: { userId, recipeId } });
}

/** Withdraws a share. Scoped by owner so a token alone can't revoke it. */
export async function revokeShare(userId: string, recipeId: string): Promise<number> {
  const { count } = await prisma.share.deleteMany({ where: { userId, recipeId } });
  return count;
}
