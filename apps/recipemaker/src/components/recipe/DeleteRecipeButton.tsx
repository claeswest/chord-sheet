"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Deleting a recipe.
//
// Two-click confirmation rather than window.confirm(): the native dialog is
// suppressed in some embedded contexts, which would turn a destructive action
// into a silent no-op, and it cannot say which recipe is about to go.
//
// The confirm state times out. A "Really delete?" button left armed on a
// worktop is a trap — you come back, click what you think is the label you
// remember, and the recipe is gone.

const ARMED_MS = 5000;

// No className prop on purpose: the armed state has to look different from the
// resting one, and a caller-supplied class is exactly how that gets overridden
// by accident.
export default function DeleteRecipeButton({
  recipeId,
  title,
}: {
  recipeId: string;
  title: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(t);
  }, [armed]);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete that.");
        setArmed(false);
        return;
      }
      router.push("/recipes");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setArmed(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="no-print inline-flex items-center gap-2">
      <button
        onClick={() => (armed ? remove() : setArmed(true))}
        disabled={busy}
        title={armed ? `Delete "${title}" permanently` : undefined}
        className={
          armed
            ? "rounded-full bg-danger px-4 py-1.5 text-sm font-semibold text-paper-raised"
            : "rounded-full px-4 py-1.5 text-sm text-ink-faint hover:bg-danger-soft hover:text-danger"
        }
      >
        {busy ? "Deleting…" : armed ? "Really delete?" : "Delete"}
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </span>
  );
}
