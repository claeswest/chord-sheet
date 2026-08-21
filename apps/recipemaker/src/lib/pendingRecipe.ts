// Where a recipe waits while someone signs in.
//
// sessionStorage, not localStorage: this is a handover that lasts one login,
// not a second place recipes live. If the tab closes on the way, the recipe is
// gone — which is correct. A recipe that quietly reappears weeks later, in a
// browser its author has forgotten using, is a surprise rather than a feature.
//
// Deliberately not a guest storage layer. Recipes are saved in one place, the
// database, and this is a corridor to it rather than a second home.

import type { ImportedRecipe } from "./recipeImport";

const KEY = "rbm_pending_recipe";

export function stashPending(imported: ImportedRecipe): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(imported));
  } catch {
    // Private mode, or a full store. Losing the handover is survivable; the
    // person still ends up signed in, just with an empty library.
  }
}

export function readPending(): ImportedRecipe | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportedRecipe) : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
