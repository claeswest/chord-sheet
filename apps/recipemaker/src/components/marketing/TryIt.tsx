"use client";

// Paste a recipe, see it as a page, then decide whether to keep it.
//
// The landing page could always show what a recipe becomes — but with somebody
// else's pancakes. This shows you yours, before you have an account, which is
// the only version of the claim that proves anything.
//
// It stores nothing. The parsed recipe lives in React state, and moves to
// sessionStorage only when someone chooses to keep it — see pendingRecipe.ts.

import { useState } from "react";
import Link from "next/link";
import RecipeView from "@/components/recipe/RecipeView";
import { HEIRLOOM } from "@/lib/canvasStyle";
import { stashPending } from "@/lib/pendingRecipe";
import type { ImportedRecipe } from "@/lib/recipeImport";

const PLACEHOLDER = `Paste a recipe here — from a website, a message, an email from your mother.

Grandma's pancakes
3 dl plain flour, ½ tsp salt, 6 dl milk, 3 eggs, 50 g butter
Whisk the flour, salt and half the milk to a smooth batter…`;

export default function TryIt() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportedRecipe | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again in a moment.");
        return;
      }
      setResult(data.imported);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        {/* The recipe as a document, exactly as the app renders it — the same
            component the cook view and the printed page use, not a mock-up. */}
        <div className="rounded-card border border-rule bg-paper-raised p-8 shadow-raise">
          <RecipeView
            recipe={{
              id: "preview",
              title: result.title,
              description: result.description,
              servings: result.servings,
              prepMinutes: result.prepMinutes,
              cookMinutes: result.cookMinutes,
              source: result.source,
              content: result.content,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            style={HEIRLOOM}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login?next=/recipes"
            onClick={() => stashPending(result)}
            className="rounded-full bg-ink px-8 py-3 text-sm font-semibold text-paper-raised"
          >
            Keep this recipe — free
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setText("");
            }}
            className="text-sm text-ink-faint hover:text-ink"
          >
            Try another
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-ink-faint">
          It&apos;s waiting for you — signing in puts it straight in your book.
        </p>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="font-body w-full rounded-card border border-rule bg-paper-raised p-5 text-base leading-relaxed placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={run}
          disabled={busy || text.trim().length < 20}
          className="rounded-full bg-ink px-7 py-3 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          {busy ? "Reading it…" : "Make it a recipe page"}
        </button>
        <span className="text-sm text-ink-faint">No account needed to try</span>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
