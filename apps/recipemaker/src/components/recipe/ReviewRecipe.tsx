"use client";

import { useState } from "react";
import type { Fix } from "@/lib/reviewRecipe";
import { amount } from "@/lib/canvasStyle";

// "Check for mistakes" — the second pass over a literal import.
//
// Every proposal is shown with what the recipe says now beside it, and applies
// only when accepted. Nothing is written to the database here: accepting edits
// the draft, and the recipe changes when you save, so an accepted suggestion
// can still be undone by not saving.

export default function ReviewRecipe({
  recipeId,
  onApply,
}: {
  recipeId: string;
  onApply: (fix: Fix) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [fixes, setFixes] = useState<Fix[] | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setError(null);
    setDone([]);
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't check that.");
        return;
      }
      setFixes(data.fixes ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const pending = (fixes ?? []).filter((f) => !done.includes(f.ingredientId));

  return (
    <section className="mt-3 rounded-card border border-rule bg-paper-raised p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Check for mistakes</h2>
          <p className="mt-1 max-w-md text-sm text-ink-muted">
            The import copies your recipe exactly, including anything odd in the original. This
            looks it over and suggests corrections — you decide.
          </p>
        </div>
        <button
          onClick={check}
          disabled={busy}
          className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold hover:bg-paper-sunken disabled:opacity-40"
        >
          {busy ? "Looking…" : fixes ? "Check again" : "Check"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {fixes !== null && pending.length === 0 && !busy && (
        <p className="mt-3 text-sm text-ink-muted">
          {fixes.length === 0
            ? "Nothing looks wrong."
            : "All suggestions dealt with. Remember to save."}
        </p>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((f) => (
            <li
              key={f.ingredientId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-rule p-3"
            >
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold tabular-nums">{f.from}</span>
                <span className="mx-2 text-ink-faint">→</span>
                <span className="font-semibold tabular-nums text-herb">
                  {amount(f.quantity, f.unit)}
                </span>
                <span className="mt-1 block text-ink-muted">{f.why}</span>
              </span>
              <button
                onClick={() => {
                  onApply(f);
                  setDone((d) => [...d, f.ingredientId]);
                }}
                className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper-raised"
              >
                Use this
              </button>
              <button
                onClick={() => setDone((d) => [...d, f.ingredientId])}
                className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
              >
                Keep mine
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
