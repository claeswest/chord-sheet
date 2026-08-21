"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@clavos/core/image";

// Paste-a-recipe. The primary way in, so it sits open on the library rather
// than behind a modal — an extra click before the thing that makes the product
// worth using is a click too many.

/**
 * Whether what was pasted is a link rather than a recipe.
 *
 * One line, nothing but a URL. Deliberately narrow: a recipe that happens to
 * mention a website in its source line is still a recipe, and fetching it
 * instead of reading it would throw away what the person actually pasted.
 */
function isBareUrl(s: string): boolean {
  const t = s.trim();
  return !/\s/.test(t) && /^https?:\/\/\S+$/i.test(t);
}

export default function ImportRecipe({
  disabled,
  intoRecipeId,
  onImported,
  startCollapsed = false,
}: {
  disabled?: boolean;
  /**
   * Show a single line until asked, rather than the whole panel.
   *
   * Open is right on an empty library, where importing is the only thing worth
   * doing. It is wrong once there are recipes: the panel took the top half of
   * the page every visit, pushing the recipes — the reason for coming — below
   * the fold, to offer something most visits don't need.
   */
  startCollapsed?: boolean;
  /**
   * Fill this recipe instead of creating one.
   *
   * For the editor, when someone pressed "New recipe" and then wanted to paste
   * or photograph after all — which is easy to do, since "New recipe" is the
   * prominent button and importing is the commoner intent.
   */
  intoRecipeId?: string;
  /** Told just before the page reloads, so the editor can clear its state. */
  onImported?: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [open, setOpen] = useState(!startCollapsed);
  const looksLikeUrl = isBareUrl(text);
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickPhoto(file: File) {
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      // A phone photo is 3-8 MB and mostly detail the model doesn't need.
      // 1600px keeps small print legible while staying well inside the limit.
      setPhoto(await compressImage(dataUrl, 1600, 0.85));
    } catch {
      setError("Couldn't read that file.");
    }
  }

  async function importRecipe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          looksLikeUrl
            ? { url: text.trim(), recipeId: intoRecipeId }
            : { text, image: photo, recipeId: intoRecipeId },
        ),
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
      if (intoRecipeId) {
        // Already in the editor. A full reload rather than router.refresh():
        // the editor holds the recipe in local state seeded on mount, and a
        // refresh re-runs the server component without replacing that state —
        // so the imported recipe would arrive behind an empty form.
        //
        // The editor is told first so it can drop its unsaved flag. Otherwise
        // a title typed before importing leaves the page "dirty", and the
        // reload raises the browser's leave-without-saving prompt about work
        // the import has just replaced anyway.
        onImported?.();
        window.location.reload();
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

  // With a photo there is nothing to type — the picture IS the input.
  // A link can be shorter than any recipe, so the twenty-character floor —
  // there to stop "pancakes" being sent to the model — must not block it.
  const tooShort = !photo && !looksLikeUrl && text.trim().length < 20;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full rounded-card border border-dashed border-rule px-6 py-4 text-left text-sm text-ink-muted hover:border-ink hover:text-ink disabled:opacity-50"
      >
        <span className="font-semibold">Paste a recipe</span>
        <span className="text-ink-faint"> — or photograph one. From a website, a message, an email.</span>
      </button>
    );
  }

  return (
    <div className="rounded-card border border-rule bg-paper-raised p-6 shadow-card">
      <h2 className="font-display text-lg font-bold">Paste a recipe</h2>
      <p className="font-body mt-1 text-sm text-ink-muted">
        A link, or the text itself — from a website, a message, an email. It gets sorted into
        ingredients and steps for you.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || busy}
        rows={5}
        placeholder={
          "https://example.com/the-recipe\n\n— or the text itself:\n\n3 dl flour\n½ tsp salt\n6 dl milk\n\nWhisk to a smooth batter and let it rest…"
        }
        className="mt-4 w-full resize-y rounded-lg border border-rule bg-paper p-3 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* capture is honoured on phones — point it at the page and shoot. */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickPhoto(f);
            e.target.value = ""; // so picking the same file twice still fires
          }}
        />
        {photo ? (
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              className="h-10 w-10 rounded border border-rule object-cover"
            />
            <button
              onClick={() => setPhoto(null)}
              className="text-sm text-ink-faint hover:text-danger"
            >
              Remove photo
            </button>
          </span>
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            disabled={disabled || busy}
            className="rounded-full border border-rule px-4 py-2 text-sm font-semibold hover:bg-paper-sunken disabled:opacity-40"
          >
            Use a photo
          </button>
        )}

        <button
          onClick={importRecipe}
          disabled={busy || disabled || tooShort}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          {busy
            ? looksLikeUrl
              ? "Fetching the page…"
              : "Reading it…"
            : photo
              ? "Read the photo"
              : looksLikeUrl
                ? "Fetch this link"
                : "Import recipe"}
        </button>
        {busy && <span className="text-sm text-ink-faint">This takes a few seconds.</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
