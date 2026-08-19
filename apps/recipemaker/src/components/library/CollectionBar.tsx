"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CollectionListItem } from "@/lib/categoryDb";

// The shelves, above the library.
//
// Filtering is links rather than client state, so a collection has its own URL:
// it survives a reload, it can be bookmarked, and the back button does what it
// looks like it does.
//
// Renaming and deleting hide behind "Edit". They are rare next to filtering,
// and a delete button beside every chip is a delete button you eventually hit
// by accident.

export default function CollectionBar({
  collections,
  activeId,
}: {
  collections: CollectionListItem[];
  activeId?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "That didn't work.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Couldn't reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!name.trim()) return;
    const ok = await send("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (ok) {
      setName("");
      setAdding(false);
    }
  }

  async function rename(id: string, current: string) {
    const next = window.prompt("Rename this collection", current);
    if (!next || next === current) return;
    await send(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
  }

  async function remove(id: string, label: string, count: number) {
    // Worth a confirm, unlike most things here — but the message says what
    // survives, because "delete collection" reads like it takes the recipes.
    const message =
      count > 0
        ? `Delete the collection "${label}"? The ${count} recipe${count === 1 ? "" : "s"} in it stay in your book.`
        : `Delete the collection "${label}"?`;
    if (!window.confirm(message)) return;
    const ok = await send(`/api/collections/${id}`, { method: "DELETE" });
    // Standing on a filter that no longer exists would show an empty library
    // with no way back.
    if (ok && activeId === id) router.push("/recipes");
  }

  const chip = "rounded-full border px-3 py-1 text-sm transition";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/recipes"
          className={`${chip} ${
            activeId ? "border-rule text-ink-muted hover:bg-paper-sunken" : "border-ink bg-ink text-paper-raised"
          }`}
        >
          All
        </Link>

        {collections.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <Link
              href={`/recipes?collection=${c.id}`}
              className={`${chip} ${
                activeId === c.id
                  ? "border-ink bg-ink text-paper-raised"
                  : "border-rule text-ink-muted hover:bg-paper-sunken"
              }`}
            >
              {c.name}
              <span className={activeId === c.id ? "opacity-70" : "text-ink-faint"}> {c.count}</span>
            </Link>
            {editing && (
              <>
                <button
                  onClick={() => rename(c.id, c.name)}
                  disabled={busy}
                  className="px-1 text-xs text-ink-faint hover:text-ink"
                  aria-label={`Rename ${c.name}`}
                >
                  Rename
                </button>
                <button
                  onClick={() => remove(c.id, c.name, c.count)}
                  disabled={busy}
                  className="px-1 text-xs text-ink-faint hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  Delete
                </button>
              </>
            )}
          </span>
        ))}

        {adding ? (
          <span className="inline-flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
                if (e.key === "Escape") { setAdding(false); setName(""); }
              }}
              placeholder="Christmas baking"
              className="w-44 rounded-full border border-rule px-3 py-1 text-sm focus:border-ink focus:outline-none"
            />
            <button
              onClick={create}
              disabled={busy || !name.trim()}
              className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper-raised disabled:opacity-40"
            >
              Add
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className={`${chip} border-dashed border-rule text-ink-muted hover:bg-paper-sunken`}
          >
            + New collection
          </button>
        )}

        {collections.length > 0 && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="ml-auto text-sm text-ink-faint hover:text-ink"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
