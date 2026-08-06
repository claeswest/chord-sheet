"use client";

// The recipe editor.
//
// Saving is explicit rather than autosave. The whole recipe body is one JSON
// column, so a background write that loses a race clobbers the entire document
// rather than one field — a "Save" button and a dirty flag are worth more here
// than the convenience.
//
// Reordering is move-up/move-down rather than drag-and-drop: no extra
// dependency, works with a keyboard, and works on touch without a long-press.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteRecipeButton from "@/components/recipe/DeleteRecipeButton";
import type {
  Ingredient,
  IngredientGroup,
  RecipeContent,
  Step,
  StepGroup,
} from "@/types/recipe";

const uid = () => Math.random().toString(36).slice(2, 10);

export type EditorRecipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  source: string | null;
  content: RecipeContent;
};

/** Moves item `i` by `delta`, returning a new array. Out-of-range is a no-op. */
function move<T>(arr: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function numberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * A textarea that grows to fit its content.
 *
 * Fixed-row textareas silently hide text: an imported description or a long
 * step is stored in full but only its first two lines are visible, which reads
 * as data loss. Height is measured in a layout effect so it is correct on the
 * first paint — imported recipes arrive with their text already in place, so
 * adjusting only on typing would be too late.
 *
 * Not `field-sizing: content`, which would do this in one CSS line: Safari
 * doesn't support it, and recipes get read on phones.
 */
function GrowTextarea({
  value,
  ...rest
}: React.ComponentProps<"textarea"> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto"; // shrink first, or it can only ever grow
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} rows={1} {...rest} />;
}

export default function RecipeEditor({ recipe }: { recipe: EditorRecipe }) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorRecipe>(recipe);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback((p: Partial<EditorRecipe>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  }, []);

  const patchContent = useCallback((p: Partial<RecipeContent>) => {
    setDraft((d) => ({ ...d, content: { ...d.content, ...p } }));
    setDirty(true);
  }, []);

  // Don't let a half-typed recipe disappear on a stray navigation.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          servings: draft.servings,
          prepMinutes: draft.prepMinutes,
          cookMinutes: draft.cookMinutes,
          source: draft.source,
          content: draft.content,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── ingredients ───────────────────────────────────────────────────────────

  const setGroups = (groups: IngredientGroup[]) => patchContent({ ingredientGroups: groups });

  function updateIngredient(gi: number, ii: number, p: Partial<Ingredient>) {
    const groups = [...draft.content.ingredientGroups];
    const items = [...groups[gi].items];
    items[ii] = { ...items[ii], ...p };
    groups[gi] = { ...groups[gi], items };
    setGroups(groups);
  }

  function addIngredient(gi: number) {
    const groups = [...draft.content.ingredientGroups];
    groups[gi] = {
      ...groups[gi],
      items: [...groups[gi].items, { id: uid(), quantity: null, unit: "", name: "" }],
    };
    setGroups(groups);
  }

  function removeIngredient(gi: number, ii: number) {
    const groups = [...draft.content.ingredientGroups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, n) => n !== ii) };
    setGroups(groups);
  }

  // ── steps ─────────────────────────────────────────────────────────────────

  const setStepGroups = (groups: StepGroup[]) => patchContent({ stepGroups: groups });

  function updateStep(gi: number, si: number, p: Partial<Step>) {
    const groups = [...draft.content.stepGroups];
    const items = [...groups[gi].items];
    items[si] = { ...items[si], ...p };
    groups[gi] = { ...groups[gi], items };
    setStepGroups(groups);
  }

  function addStep(gi: number) {
    const groups = [...draft.content.stepGroups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, { id: uid(), text: "" }] };
    setStepGroups(groups);
  }

  function removeStep(gi: number, si: number) {
    const groups = [...draft.content.stepGroups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, n) => n !== si) };
    setStepGroups(groups);
  }

  // Deliberately carries NO width. It used to start with `w-full`, and the
  // narrow fields below appended `w-16`/`w-20` on top — but Tailwind resolves
  // conflicting utilities by stylesheet order, not by the order they appear in
  // the class attribute, so `w-full` won and the ingredient name got squeezed
  // to nothing. Every caller states its own width.
  const input =
    "rounded-lg border border-rule px-3 py-2 text-sm focus:border-ink focus:outline-none";
  const iconBtn =
    "rounded px-2 py-1 text-xs text-ink-faint hover:bg-paper-sunken hover:text-ink disabled:opacity-30";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Save bar — sticky so it's reachable from anywhere in a long recipe */}
      <div className="sticky top-0 z-10 -mx-6 mb-8 flex items-center gap-3 border-b border-rule bg-paper/90 px-6 py-3 backdrop-blur">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
        <span className="ml-auto text-sm text-ink-faint">
          {draft.content.ingredientGroups.reduce((n, g) => n + g.items.length, 0)} ingredients ·{" "}
          {draft.content.stepGroups.reduce((n, g) => n + g.items.length, 0)} steps
        </span>
        <DeleteRecipeButton recipeId={recipe.id} title={draft.title} />
      </div>

      <input
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="Recipe title"
        className="font-display w-full text-3xl font-extrabold outline-none placeholder:text-ink-faint"
      />

      <GrowTextarea
        value={draft.description ?? ""}
        onChange={(e) => patch({ description: e.target.value || null })}
        placeholder="A line about this recipe — where it came from, why it matters"
        className="mt-3 w-full resize-none overflow-hidden text-ink-muted outline-none placeholder:text-ink-faint"
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="text-sm">
          <span className="text-ink-muted">Serves</span>
          <input
            value={draft.servings ?? ""}
            onChange={(e) => patch({ servings: numberOrNull(e.target.value) })}
            inputMode="numeric"
            className={`mt-1 w-full ${input}`}
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">Prep (min)</span>
          <input
            value={draft.prepMinutes ?? ""}
            onChange={(e) => patch({ prepMinutes: numberOrNull(e.target.value) })}
            inputMode="numeric"
            className={`mt-1 w-full ${input}`}
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">Cook (min)</span>
          <input
            value={draft.cookMinutes ?? ""}
            onChange={(e) => patch({ cookMinutes: numberOrNull(e.target.value) })}
            inputMode="numeric"
            className={`mt-1 w-full ${input}`}
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">Source</span>
          <input
            value={draft.source ?? ""}
            onChange={(e) => patch({ source: e.target.value || null })}
            placeholder="Mormor Karin"
            className={`mt-1 w-full ${input}`}
          />
        </label>
      </div>

      {/* ── Ingredients ─────────────────────────────────────────────────── */}
      {draft.content.ingredientGroups.map((g, gi) => (
        <section key={g.id} className="mt-10">
          <input
            value={g.heading}
            onChange={(e) => {
              const groups = [...draft.content.ingredientGroups];
              groups[gi] = { ...groups[gi], heading: e.target.value };
              setGroups(groups);
            }}
            placeholder="Ingredients"
            className="text-lg font-bold outline-none placeholder:text-ink-faint"
          />

          <ul className="mt-3 space-y-2">
            {g.items.map((it, ii) => (
              <li key={it.id} className="flex items-center gap-2">
                <input
                  value={it.quantity ?? ""}
                  onChange={(e) => updateIngredient(gi, ii, { quantity: numberOrNull(e.target.value) })}
                  placeholder="3"
                  inputMode="decimal"
                  className={`${input} w-16 shrink-0 font-semibold text-herb tabular-nums`}
                  aria-label="Quantity"
                />
                <input
                  value={it.unit}
                  onChange={(e) => updateIngredient(gi, ii, { unit: e.target.value })}
                  placeholder="dl"
                  // w-24, not w-20: "portioner", "matskedar" and "förpackning"
                  // all overflowed 80px and got visually truncated mid-word.
                  className={`${input} w-24 shrink-0`}
                  aria-label="Unit"
                />
                <input
                  value={it.name}
                  onChange={(e) => updateIngredient(gi, ii, { name: e.target.value })}
                  placeholder="plain flour"
                  className={`${input} min-w-0 flex-1`}
                  aria-label="Ingredient"
                />
                <button
                  onClick={() => {
                    const groups = [...draft.content.ingredientGroups];
                    groups[gi] = { ...groups[gi], items: move(groups[gi].items, ii, -1) };
                    setGroups(groups);
                  }}
                  disabled={ii === 0}
                  className={iconBtn}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => {
                    const groups = [...draft.content.ingredientGroups];
                    groups[gi] = { ...groups[gi], items: move(groups[gi].items, ii, 1) };
                    setGroups(groups);
                  }}
                  disabled={ii === g.items.length - 1}
                  className={iconBtn}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button onClick={() => removeIngredient(gi, ii)} className={iconBtn} aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => addIngredient(gi)}
            className="mt-3 text-sm font-medium text-ink-muted hover:text-ink"
          >
            + Add ingredient
          </button>
        </section>
      ))}

      <button
        onClick={() =>
          setGroups([
            ...draft.content.ingredientGroups,
            { id: uid(), heading: "For the sauce", items: [] },
          ])
        }
        className="mt-3 text-sm text-ink-faint hover:text-ink"
      >
        + Add ingredient group
      </button>

      {/* ── Method ──────────────────────────────────────────────────────── */}
      {draft.content.stepGroups.map((g, gi) => (
        <section key={g.id} className="mt-10">
          <input
            value={g.heading}
            onChange={(e) => {
              const groups = [...draft.content.stepGroups];
              groups[gi] = { ...groups[gi], heading: e.target.value };
              setStepGroups(groups);
            }}
            placeholder="Method"
            className="text-lg font-bold outline-none placeholder:text-ink-faint"
          />

          <ol className="mt-3 space-y-2">
            {g.items.map((s, si) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper-raised">
                  {si + 1}
                </span>
                <GrowTextarea
                  value={s.text}
                  onChange={(e) => updateStep(gi, si, { text: e.target.value })}
                  placeholder="Whisk the flour, salt and half the milk to a smooth batter."
                  className={`${input} min-w-0 flex-1 resize-none overflow-hidden`}
                  aria-label={`Step ${si + 1}`}
                />
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      const groups = [...draft.content.stepGroups];
                      groups[gi] = { ...groups[gi], items: move(groups[gi].items, si, -1) };
                      setStepGroups(groups);
                    }}
                    disabled={si === 0}
                    className={iconBtn}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      const groups = [...draft.content.stepGroups];
                      groups[gi] = { ...groups[gi], items: move(groups[gi].items, si, 1) };
                      setStepGroups(groups);
                    }}
                    disabled={si === g.items.length - 1}
                    className={iconBtn}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button onClick={() => removeStep(gi, si)} className={iconBtn} aria-label="Remove">
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={() => addStep(gi)}
            className="mt-3 text-sm font-medium text-ink-muted hover:text-ink"
          >
            + Add step
          </button>
        </section>
      ))}

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Notes</h2>
        <ul className="mt-3 space-y-2">
          {draft.content.notes.map((n, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={n}
                onChange={(e) => {
                  const notes = [...draft.content.notes];
                  notes[i] = e.target.value;
                  patchContent({ notes });
                }}
                placeholder="Serve with lingonberry jam."
                className={`${input} min-w-0 flex-1`}
              />
              <button
                onClick={() => patchContent({ notes: draft.content.notes.filter((_, n2) => n2 !== i) })}
                className={iconBtn}
                aria-label="Remove note"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => patchContent({ notes: [...draft.content.notes, ""] })}
          className="mt-3 text-sm font-medium text-ink-muted hover:text-ink"
        >
          + Add note
        </button>
      </section>
    </div>
  );
}
