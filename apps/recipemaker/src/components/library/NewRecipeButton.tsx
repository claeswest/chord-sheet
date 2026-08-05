"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Creates an empty recipe and goes straight into the editor. */
export default function NewRecipeButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }), // the API titles it "Untitled recipe"
      });
      if (res.status === 403) {
        setError("You've used all your free recipe slots.");
        return;
      }
      if (!res.ok) throw new Error(`Could not create recipe (${res.status})`);
      const { recipe } = await res.json();
      router.push(`/recipes/${recipe.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={create}
        disabled={busy || disabled}
        className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Creating…" : "New recipe"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
