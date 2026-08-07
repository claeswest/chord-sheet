"use client";

import { useRef, useState } from "react";
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
  onSaved,
}: {
  recipeId: string;
  /** Omit for the finished-dish picture. */
  stepId?: string;
  hasImage: boolean;
  canGenerate: boolean;
  label?: string;
  /**
   * Called with the stored picture, or null when it's removed.
   *
   * The editor keeps the whole recipe in local state, and router.refresh()
   * re-runs the server component without resetting that state — so without
   * this the editor would go on believing there is no picture, and show the
   * "Draw" button next to an image that already exists.
   */
  onSaved?: (dataUrl: string | null) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

      await store(data.dataUrl);
    } catch {
      setError("Something went wrong drawing that.");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Your own photograph, instead of a drawing.
   *
   * Not gated on the plan, unlike generating one. Uploading costs nothing but
   * the storage, and a picture of a dish you actually cooked is the better
   * picture anyway — charging for that would be charging for the honest option.
   */
  async function upload(file: File) {
    setBusy("Reading…");
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      await store(dataUrl);
    } catch {
      setError("Couldn't read that file.");
      setBusy(null);
    }
  }

  /** Shrink and save — shared by the generated and the uploaded path. */
  async function store(dataUrl: string) {
    setBusy("Saving…");
    const full = await compressImage(dataUrl, FULL_PX, 0.82);
    const thumb = stepId ? undefined : await compressImage(dataUrl, THUMB_PX, 0.7);

    const save = await fetch(`/api/recipes/${recipeId}/image`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full, thumb, stepId }),
    });
    if (!save.ok) {
      const d = await save.json().catch(() => ({}));
      setError(d.error ?? "Couldn't save the picture.");
      setBusy(null);
      return;
    }
    onSaved?.(full);
    router.refresh();
    setBusy(null);
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
      onSaved?.(null);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="no-print inline-flex flex-wrap items-center gap-2">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={generate}
        disabled={busy !== null || !canGenerate}
        title={canGenerate ? undefined : "Pictures are part of the paid plan"}
        className="rounded-full border border-rule px-3 py-1 text-xs font-semibold hover:bg-paper-sunken disabled:opacity-40"
      >
        {busy ?? (hasImage ? "Draw again" : label)}
      </button>
      <button
        onClick={() => fileInput.current?.click()}
        disabled={busy !== null}
        className="rounded-full border border-rule px-3 py-1 text-xs hover:bg-paper-sunken disabled:opacity-40"
      >
        Upload
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
