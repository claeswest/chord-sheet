"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@clavos/core/image";

// Draw a picture, shrink it, store it.
//
// The model returns roughly 1.8 MB of PNG. Storing that would put a megabyte
// into a JSON column and send it down again on every read, so the browser
// re-encodes it before anything is saved — the same trick ChordSheetMaker uses
// for song backgrounds, where 27 stored images come to 6.5 MB in total.
//
// Two sizes for the hero picture: a small one for the library cards, which are
// listed ten at a time, and a full one for the recipe page and the printout.
const THUMB_PX = 400;
const FULL_PX = 1280;

export default function GenerateImage({
  recipeId,
  stepId,
  hasImage,
  canGenerate,
  label = "Add a picture",
}: {
  recipeId: string;
  /** Omit for the finished-dish picture. */
  stepId?: string;
  hasImage: boolean;
  canGenerate: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      setBusy("Drawing…");
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, kind: stepId ? "step" : "hero", stepId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "upgrade_required"
            ? "Pictures are part of the paid plan."
            : (data.error ?? "Couldn't draw that."),
        );
        return;
      }

      setBusy("Saving…");
      const full = await compressImage(data.dataUrl, FULL_PX, 0.82);
      const thumb = stepId ? undefined : await compressImage(data.dataUrl, THUMB_PX, 0.7);

      const save = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full, thumb, stepId }),
      });
      if (!save.ok) {
        const d = await save.json().catch(() => ({}));
        setError(d.error ?? "Couldn't save the picture.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong drawing that.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("Removing…");
    setError(null);
    try {
      await fetch(`/api/recipes/${recipeId}/image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="no-print inline-flex flex-wrap items-center gap-2">
      <button
        onClick={generate}
        disabled={busy !== null || !canGenerate}
        title={canGenerate ? undefined : "Pictures are part of the paid plan"}
        className="rounded-full border border-rule px-3 py-1 text-xs font-semibold hover:bg-paper-sunken disabled:opacity-40"
      >
        {busy ?? (hasImage ? "Draw again" : label)}
      </button>
      {hasImage && (
        <button
          onClick={remove}
          disabled={busy !== null}
          className="rounded-full px-2 py-1 text-xs text-ink-faint hover:text-danger disabled:opacity-40"
        >
          Remove
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
