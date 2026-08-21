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
import GenerateImage from "@/components/recipe/GenerateImage";
import StylePicker from "@/components/recipe/StylePicker";
import StylePreview from "@/components/recipe/StylePreview";
import StyleControls from "@/components/recipe/StyleControls";
import ReviewRecipe from "@/components/recipe/ReviewRecipe";
import ImportRecipe from "@/components/library/ImportRecipe";
import type { CanvasStyle } from "@/lib/canvasStyle";
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

/** The content minus every picture. See the note in save(). */
function withoutImages(content: RecipeContent): RecipeContent {
  const { heroImage, ...rest } = content;
  void heroImage;
  return {
    ...rest,
    stepGroups: content.stepGroups.map((g) => ({
      ...g,
      items: g.items.map(({ imageUrl, ...s }) => {
        void imageUrl;
        return s;
      }),
    })),
  };
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

export default function RecipeEditor({
  recipe,
  canDraw = false,
  style,
}: {
  recipe: EditorRecipe;
  /** Whether the plan includes generated pictures. */
  canDraw?: boolean;
  /** The recipe's canvas style, for the picker's preview. */
  style: CanvasStyle;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorRecipe>(recipe);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Steps whose picture controls are open. Ids rather than indexes, so moving
  // a step up or down doesn't open a different one.
  const [openPictures, setOpenPictures] = useState<string[]>([]);
  // Ingredients whose note field has been asked for. One that already has a
  // note doesn't need to be listed — the field shows because the note exists.
  const [openNotes, setOpenNotes] = useState<string[]>([]);

  // A working copy so the preview follows the sliders live. The picker and the
  // generator write to the server and refresh, which brings a new `style` prop
  // down — this effect adopts it so the two ways of choosing stay in step.
  const [workingStyle, setWorkingStyle] = useState(style);
  useEffect(() => setWorkingStyle(style), [style]);

  // Nothing typed and nothing imported yet — measured on the draft, so it
  // vanishes the moment you start rather than waiting for a save.
  const isEmpty =
    !draft.content.ingredientGroups.some((g) => g.items.length > 0) &&
    !draft.content.stepGroups.some((g) => g.items.length > 0);

  const patch = useCallback((p: Partial<EditorRecipe>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  }, []);

  const patchContent = useCallback((p: Partial<RecipeContent>) => {
    setDraft((d) => ({ ...d, content: { ...d.content, ...p } }));
    setDirty(true);
  }, []);

  // Closing the tab or reloading still gets the browser's own warning.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /**
   * Leaving by a link inside the app saves first.
   *
   * beforeunload does not fire on client-side navigation, so "Cook view →" and
   * "← All recipes" — both directly above the editor, and the obvious next
   * click after an edit — discarded unsaved work in silence.
   *
   * Saving beats asking. A confirm dialog puts the burden back on someone who
   * has just told us what they want by editing, and can be suppressed by the
   * browser, which would either trap them on the page or lose the work anyway.
   */
  useEffect(() => {
    if (!dirty) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // opening in a new tab

      const link = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const href = link?.getAttribute("href") ?? "";
      if (!link || link.target === "_blank" || !href.startsWith("/")) return;

      e.preventDefault();
      void (async () => {
        const ok = await save();
        // On failure stay put, with the error already on screen — navigating
        // away from a failed save is exactly how the work would be lost.
        if (ok) router.push(href);
      })();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Saves the working copy, or a specific one.
   *
   * The argument matters: accepting a suggestion sets state and saves in the
   * same tick, and state updates aren't visible until the next render — so
   * saving `draft` there would write the version from before the correction.
   */
  async function save(next?: EditorRecipe): Promise<boolean> {
    const d = next ?? draft;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: d.title,
          description: d.description,
          servings: d.servings,
          prepMinutes: d.prepMinutes,
          cookMinutes: d.cookMinutes,
          source: d.source,
          // Pictures are stripped out. A recipe with a hero and six step
          // illustrations carries well over a megabyte, and Vercel rejects a
          // request body above 4.5 MB — so a fully illustrated recipe would
          // simply stop saving. The server merges the stored images back in.
          content: withoutImages(d.content),
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setDirty(false);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
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
        {/* The button always says what it does. It used to read "Saved" when
            there was nothing to save, which is a state pretending to be an
            action — it invites a click that does nothing. State is text. */}
        <button
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised disabled:opacity-40"
        >
          Save
        </button>
        <span className={`text-sm ${dirty ? "text-accent" : "text-ink-faint"}`}>
          {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
        </span>
        {error && <span className="text-sm text-danger">{error}</span>}
        <span className="ml-auto text-sm text-ink-faint">
          {draft.content.ingredientGroups.reduce((n, g) => n + g.items.length, 0)} ingredients ·{" "}
          {draft.content.stepGroups.reduce((n, g) => n + g.items.length, 0)} steps
        </span>
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

      {/* An empty recipe offers the way in that the library offers. "New
          recipe" is the prominent button, but pasting or photographing is the
          commoner intent — landing in a blank form with no way to import was a
          dead end you had to back out of. It disappears once there's content,
          and the API refuses to fill a recipe that isn't empty. */}
      {isEmpty && (
        <div className="mt-8">
          <ImportRecipe intoRecipeId={draft.id} onImported={() => setDirty(false)} />
        </div>
      )}

      {/* ── Picture of the finished recipe ────────────────────────────────
          Labelled, because two unexplained buttons floating between the time
          fields and the ingredients don't say what they'd be a picture OF. */}
      <p className="mt-8 text-xs uppercase tracking-[0.14em] text-ink-faint">Picture</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {draft.content.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.content.heroImage}
            alt=""
            className="h-24 w-24 rounded-lg border border-rule object-cover"
          />
        )}
        <GenerateImage
          recipeId={draft.id}
          hasImage={Boolean(draft.content.heroImage)}
          canGenerate={canDraw}
          label="Draw a picture of it"
          onSaved={(url) => patchContent({ heroImage: url ?? undefined })}
        />
      </div>

      {/* ── Ingredients ─────────────────────────────────────────────────── */}
      {draft.content.ingredientGroups.map((g, gi) => (
        <section key={g.id} className="mt-10">
          {/* Which section a named group belongs to. Without this, a recipe with a
              "Cream Cheese Frosting" group of ingredients AND of steps shows the
              same bold heading twice and reads as a duplicate. Above the name,
              not below: a kicker is read on the way in. */}
          {g.heading && (
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Ingredients</p>
          )}
          <input
            value={g.heading}
            onChange={(e) => {
              const groups = [...draft.content.ingredientGroups];
              groups[gi] = { ...groups[gi], heading: e.target.value };
              setGroups(groups);
            }}
            placeholder="Ingredients"
            className="block text-lg font-bold outline-none placeholder:text-ink-faint"
          />

          <ul className="mt-3 space-y-2">
            {g.items.map((it, ii) => (
              <li key={it.id} className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={it.quantity ?? ""}
                      onChange={(e) => updateIngredient(gi, ii, { quantity: numberOrNull(e.target.value) })}
                      // Hints only while the row is still blank. On a filled row —
                      // "4 eggs", "salt" — a grey "3" or "dl" sitting in an empty
                      // box is indistinguishable at a glance from a real value, and
                      // eggs genuinely have no unit.
                      placeholder={it.name ? "" : "3"}
                      inputMode="decimal"
                      className={`${input} w-16 shrink-0 font-semibold text-herb tabular-nums`}
                      aria-label="Quantity"
                    />
                    <input
                      value={it.unit}
                      onChange={(e) => updateIngredient(gi, ii, { unit: e.target.value })}
                      placeholder={it.name ? "" : "dl"}
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
                  </div>

                  {/* The note, on its own line under the ingredient.
                      It was invisible here until now, while the cook view and
                      the printed page showed it — so the importer could write
                      "2 1/2 - 3 dl" or "as written" into a recipe and leave no
                      way to read or correct it. That is the wrong half of the
                      product to hide something in.

                      Indented under the name from sm up, so it reads as
                      belonging to the ingredient rather than as a new row. */}
                  {(it.note || openNotes.includes(it.id)) && (
                    <input
                      value={it.note ?? ""}
                      onChange={(e) => {
                        // Held open from the first keystroke. Otherwise
                        // deleting the last character of an imported note
                        // removes the field from under the cursor, which reads
                        // as the app crashing rather than as an empty field.
                        setOpenNotes((o) => (o.includes(it.id) ? o : [...o, it.id]));
                        updateIngredient(gi, ii, { note: e.target.value });
                      }}
                      placeholder="finely chopped · to taste · 2–3 dl"
                      className={`${input} w-full text-ink-muted sm:ml-44 sm:w-[calc(100%-11rem)]`}
                      aria-label={`Note for ${it.name || "ingredient"}`}
                    />
                  )}
                </div>

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
                {/* Same idea as the step's Picture button: a trigger in the
                    cluster costs width, not height, so a recipe without notes
                    stays as short as it was. Hidden once there is a note,
                    because the field is then already on screen. */}
                {!it.note && (
                  <button
                    onClick={() =>
                      setOpenNotes((o) =>
                        o.includes(it.id) ? o.filter((x) => x !== it.id) : [...o, it.id],
                      )
                    }
                    className={`${iconBtn} whitespace-nowrap`}
                    aria-expanded={openNotes.includes(it.id)}
                    aria-label={`Note for ${it.name || "ingredient"}`}
                  >
                    Note
                  </button>
                )}
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
          {g.heading && (
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Method</p>
          )}
          <input
            value={g.heading}
            onChange={(e) => {
              const groups = [...draft.content.stepGroups];
              groups[gi] = { ...groups[gi], heading: e.target.value };
              setStepGroups(groups);
            }}
            placeholder="Method"
            className="block text-lg font-bold outline-none placeholder:text-ink-faint"
          />


          <ol className="mt-3 space-y-2">
            {g.items.map((s, si) => (
              <li key={s.id} className="group flex items-start gap-2">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper-raised">
                  {si + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <GrowTextarea
                    value={s.text}
                    onChange={(e) => updateStep(gi, si, { text: e.target.value })}
                    placeholder="Whisk the flour, salt and half the milk to a smooth batter."
                    className={`${input} w-full resize-none overflow-hidden`}
                    aria-label={`Step ${si + 1}`}
                  />
                  {/* Opened by the Picture button in the controls beside this
                      step, or already open because there is one.

                      This used to reveal on focus, which hid it well enough
                      that it read as a missing feature. Height was the reason,
                      and most of that turned out to be the control buttons
                      stacking vertically — fixed separately. What's left is a
                      trigger that costs width, not height. */}
                  <div
                    className={`mt-2 flex-wrap items-center gap-3 ${
                      s.imageUrl || openPictures.includes(s.id) ? "flex" : "hidden"
                    }`}
                  >
                    {s.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-rule object-cover"
                      />
                    )}
                    <GenerateImage
                      recipeId={draft.id}
                      stepId={s.id}
                      hasImage={Boolean(s.imageUrl)}
                      canGenerate={canDraw}
                      label="Illustrate this step"
                      onSaved={(url) => updateStep(gi, si, { imageUrl: url ?? undefined })}
                    />
                  </div>
                </div>
                {/* Horizontal, not stacked. Three buttons on top of each other
                    are taller than the textarea beside them, so they, not the
                    text, set the height of every step — a one-line step took
                    three lines of page. */}
                <div className="flex shrink-0 items-start">
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
                  {/* In the cluster, not under the step: the row is already
                      here, so this costs width and no height. */}
                  {!s.imageUrl && (
                    <button
                      onClick={() =>
                        setOpenPictures((o) =>
                          o.includes(s.id) ? o.filter((x) => x !== s.id) : [...o, s.id],
                        )
                      }
                      className={`${iconBtn} whitespace-nowrap`}
                      aria-expanded={openPictures.includes(s.id)}
                      aria-label={`Picture for step ${si + 1}`}
                    >
                      Picture
                    </button>
                  )}
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

      {/* ── Finishing ───────────────────────────────────────────────────────
          Checking and appearance live below the recipe, not inside it. They
          used to sit between the title and the ingredients, where three panels
          separated a cook from the thing they came to edit. Both are things
          you do once the recipe is right. */}
      <div className="mt-14 flex items-center gap-4">
        <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">Finishing</span>
        <hr className="flex-1 border-rule" />
      </div>

      <ReviewRecipe
        recipeId={draft.id}
        onApply={(fix) => {
          // Saved immediately, not left in the draft. Clicking "Use this" is a
          // decision already made, and leaving it unsaved meant it vanished on
          // the next click. Still reversible: it's an ordinary field.
          const groups = draft.content.ingredientGroups.map((g) => ({
            ...g,
            items: g.items.map((i) =>
              i.id === fix.ingredientId ? { ...i, quantity: fix.quantity, unit: fix.unit } : i,
            ),
          }));
          const next = { ...draft, content: { ...draft.content, ingredientGroups: groups } };
          setDraft(next);
          void save(next);
        }}
      />

      <section className="mt-3 flex flex-wrap items-start gap-4 rounded-card border border-rule bg-paper-raised p-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">How it looks</h2>
          <p className="mt-1 max-w-md text-sm text-ink-muted">
            Fonts and colours for this recipe alone. &ldquo;Style this recipe&rdquo; reads what
            it is — the title, what&apos;s in it, where it came from — and picks a palette to
            suit.
          </p>
          <div className="mt-3">
            <StylePicker recipeId={draft.id} />
          </div>
        </div>
        <StylePreview style={workingStyle} title={draft.title} />
      </section>

      {/* Closed by default: two menus, two sliders and six colour wells is a
          lot of permanently open controls for something most people set once,
          if at all. The presets above are the answer for nearly everyone. */}
      <details className="mt-3 rounded-card border border-rule bg-paper-raised p-4">
        <summary className="cursor-pointer text-sm font-semibold">Set it yourself</summary>
        <StyleControls recipeId={draft.id} style={workingStyle} onChange={setWorkingStyle} />
      </details>

      {/* Deleting belongs at the end of the page, not beside a count of
          ingredients at the top under the "Cook view" link. */}
      <div className="mt-10 flex items-center gap-3 border-t border-rule pt-6">
        <span className="text-sm text-ink-faint">Finished with this recipe?</span>
        <DeleteRecipeButton recipeId={recipe.id} title={draft.title} />
      </div>
    </div>
  );
}
