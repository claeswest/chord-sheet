"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CollectionListItem } from "@/lib/categoryDb";

// Which collections this recipe is in.
//
// Saves on every tick rather than waiting for the recipe's Save button. Filing
// is not part of the draft — you either put it on the shelf or you didn't —
// and the editor's Save deliberately carries only the recipe's own fields.
// Leaving this to it would mean a tick that quietly did nothing.

export default function CollectionPicker({
  recipeId,
  collections,
  initialIds,
}: {
  recipeId: string;
  collections: CollectionListItem[];
  initialIds: string[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(initialIds);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(next: string[]) {
    const previous = ids;
    setIds(next); // optimistic: a checkbox that lags feels broken
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/collections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionIds: next }),
      });
      if (!res.ok) {
        setIds(previous); // put the tick back where it was
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Couldn't save that.");
        return;
      }
      router.refresh();
    } catch {
      setIds(previous);
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    save(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  async function createAndTick() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that.");
        return;
      }
      setName("");
      setAdding(false);
      // Making a collection from here always means putting this recipe in it.
      await save([...ids, data.id]);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Collections</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {collections.map((c) => {
          const on = ids.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              disabled={busy}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-sm transition disabled:opacity-50 ${
                on
                  ? "border-ink bg-ink text-paper-raised"
                  : "border-rule text-ink-muted hover:bg-paper-sunken"
              }`}
            >
              {on ? "✓ " : ""}
              {c.name}
            </button>
          );
        })}

        {adding ? (
          <span className="inline-flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createAndTick();
                if (e.key === "Escape") { setAdding(false); setName(""); }
              }}
              placeholder="Christmas baking"
              className="w-44 rounded-full border border-rule px-3 py-1 text-sm focus:border-ink focus:outline-none"
            />
            <button
              onClick={createAndTick}
              disabled={busy || !name.trim()}
              className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper-raised disabled:opacity-40"
            >
              Add
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            disabled={busy}
            className="rounded-full border border-dashed border-rule px-3 py-1 text-sm text-ink-muted hover:bg-paper-sunken disabled:opacity-50"
          >
            + New collection
          </button>
        )}
      </div>

      {collections.length === 0 && !adding && (
        <p className="mt-2 text-sm text-ink-faint">
          Collections are folders for your book — &ldquo;Baking&rdquo;, &ldquo;Weeknights&rdquo;,
          &ldquo;Christmas&rdquo;. A recipe can be in several.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
