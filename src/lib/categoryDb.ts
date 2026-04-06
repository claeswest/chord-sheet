export interface DbCategory {
  id: string;
  name: string;
  order: number;
  songIds: string[];
}

export async function fetchCategories(): Promise<DbCategory[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(name: string): Promise<DbCategory> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await fetch(`/api/categories/${id}`, { method: "DELETE" });
}

export async function addSongToCategory(categoryId: string, songId: string): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/songs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("addSongToCategory failed", res.status, body);
  }
}

export async function removeSongFromCategory(categoryId: string, songId: string): Promise<void> {
  await fetch(`/api/categories/${categoryId}/songs`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId }),
  });
}

export async function reorderSongsInCategory(categoryId: string, songIds: string[]): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/songs`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to reorder songs (${res.status})`);
  }
}
