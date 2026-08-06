"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/lib/canvasStyle";

// Choosing how a recipe looks. Three presets as swatches, plus "Style this
// recipe" which generates one from what the recipe actually is.
//
// It sits on the cook view rather than in the editor because you judge a style
// by looking at the finished page, not at a form.

export default function StylePicker({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/ai/style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't apply that style.");
        return;
      }
      // The page is a server component reading Recipe.style — refresh rather
      // than mirroring the style in client state, so what you see is what was
      // actually saved.
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-muted">Style</span>

      {Object.entries(PRESETS).map(([name, s]) => (
        <button
          key={name}
          onClick={() => apply({ preset: name }, name)}
          disabled={busy !== null}
          title={name.toLowerCase()}
          aria-label={`Apply the ${name.toLowerCase()} style`}
          className="h-7 w-7 rounded-full border border-rule disabled:opacity-40"
          style={{
            background: s.bg,
            // A ring of the accent so the swatch shows more than the paper colour.
            boxShadow: `inset 0 0 0 3px ${s.accent}`,
          }}
        />
      ))}

      <button
        onClick={() => apply({}, "ai")}
        disabled={busy !== null}
        className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold hover:bg-paper-sunken disabled:opacity-40"
      >
        {busy === "ai" ? "Styling…" : "Style this recipe"}
      </button>

      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
