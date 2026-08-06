"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Paste-a-recipe. The primary way in, so it sits open on the library rather
// than behind a modal — an extra click before the thing that makes the product
// worth using is a click too many.

export default function ImportRecipe({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importRecipe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "limit_reached"
            ? `You've filled all ${data.limit} free recipe slots.`
            : (data.error ?? "Something went wrong. Try again."),
        );
        return;
      }
      // Straight into the editor — the import is a starting point, not a
      // finished recipe, and it reads better once you can see it.
      router.push(`/recipes/${data.id}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const tooShort = text.trim().length < 20;

  return (
    <div className="rounded-card border border-rule bg-paper-raised p-6 shadow-card">
      <h2 className="font-display text-lg font-bold">Paste a recipe</h2>
      <p className="font-body mt-1 text-sm text-ink-muted">
        From a website, a message, an email — anywhere. It gets sorted into ingredients and
        steps for you.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || busy}
        rows={5}
        placeholder={"3 dl flour\n½ tsp salt\n6 dl milk\n\nWhisk to a smooth batter and let it rest…"}
        className="mt-4 w-full resize-y rounded-lg border border-rule bg-paper p-3 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={importRecipe}
          disabled={busy || disabled || tooShort}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          {busy ? "Reading it…" : "Import recipe"}
        </button>
        {busy && <span className="text-sm text-ink-faint">This takes a few seconds.</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
