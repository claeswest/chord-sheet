"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type CanvasStyle,
  FONT_KEYS,
  BODY_FONT_KEYS,
  FONT_STACKS,
  TITLE_SIZE_DEFAULT,
  BODY_SIZE_DEFAULT,
  TITLE_SIZE_RANGE,
  BODY_SIZE_RANGE,
  contrast,
} from "@/lib/canvasStyle";

// Setting the look by hand — typeface, size and colour — the way
// ChordSheetMaker lets you style a title, artist line or chord.
//
// Changes apply to the preview immediately and are saved on "Apply", not on
// every keystroke: a colour input fires continuously while you drag, and that
// would be a write per frame.

const COLOURS: { key: keyof CanvasStyle; label: string }[] = [
  { key: "bg", label: "Paper" },
  { key: "ink", label: "Text" },
  { key: "accent", label: "Headings" },
  { key: "qty", label: "Quantities" },
  { key: "muted", label: "Notes" },
  { key: "rule", label: "Lines" },
];

/** The stored value is a full stack; the control needs the key it came from. */
function keyOf(stack: string): string {
  return FONT_KEYS.find((k) => FONT_STACKS[k] === stack) ?? "serif";
}

export default function StyleControls({
  recipeId,
  style,
  onChange,
}: {
  recipeId: string;
  style: CanvasStyle;
  /** Live preview — the parent holds the working copy. */
  onChange: (s: CanvasStyle) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const set = (p: Partial<CanvasStyle>) => onChange({ ...style, ...p });

  async function apply() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/style`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...style,
          // Fonts are stored as keys' resolved stacks already; send as-is.
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Couldn't save the style.");
        return;
      }
      setNote(data.warning ?? "Saved.");
      router.refresh();
    } catch {
      setNote("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const inkRatio = contrast(style.ink, style.bg);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-ink-muted">Headings</span>
          <select
            value={keyOf(style.display)}
            onChange={(e) => set({ display: FONT_STACKS[e.target.value] })}
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm"
          >
            {FONT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-ink-muted">Body</span>
          <select
            value={keyOf(style.body)}
            onChange={(e) => set({ body: FONT_STACKS[e.target.value] })}
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm"
          >
            {/* Handwriting and mono are missing on purpose — see BODY_FONT_KEYS. */}
            {BODY_FONT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-ink-muted">
            Title size — {style.titleSize ?? TITLE_SIZE_DEFAULT}px
          </span>
          <input
            type="range"
            min={TITLE_SIZE_RANGE[0]}
            max={TITLE_SIZE_RANGE[1]}
            value={style.titleSize ?? TITLE_SIZE_DEFAULT}
            onChange={(e) => set({ titleSize: Number(e.target.value) })}
            className="mt-2 w-full"
          />
        </label>

        <label className="text-sm">
          <span className="text-ink-muted">
            Body size — {style.bodySize ?? BODY_SIZE_DEFAULT}px
          </span>
          <input
            type="range"
            min={BODY_SIZE_RANGE[0]}
            max={BODY_SIZE_RANGE[1]}
            value={style.bodySize ?? BODY_SIZE_DEFAULT}
            onChange={(e) => set({ bodySize: Number(e.target.value) })}
            className="mt-2 w-full"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {COLOURS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={String(style[key])}
              onChange={(e) => set({ [key]: e.target.value } as Partial<CanvasStyle>)}
              className="h-7 w-7 cursor-pointer rounded border border-rule bg-transparent p-0"
              aria-label={label}
            />
            <span className="text-ink-muted">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={apply}
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          {busy ? "Saving…" : "Apply"}
        </button>
        {inkRatio < 4.5 && (
          <span className="text-sm text-danger">
            Text is {inkRatio.toFixed(1)}:1 on the paper colour — hard to read in print.
          </span>
        )}
        {note && <span className="text-sm text-ink-muted">{note}</span>}
      </div>
    </div>
  );
}
