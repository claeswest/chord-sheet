import type { ReactNode } from "react";
import type { Recipe } from "@/types/recipe";
import { totalMinutes } from "@/types/recipe";
import {
  type CanvasStyle,
  styleVars,
  amount,
  TITLE_SIZE_DEFAULT,
  BODY_SIZE_DEFAULT,
} from "@/lib/canvasStyle";

// The recipe as a document: what you read while cooking, and what comes out of
// the printer. Unlike RecipeSample this shows everything — every group, every
// heading, the notes, the meta line.
//
// It carries no interactive controls at all. That is the point: the editor is
// full of input boxes, which is the wrong thing to have open on a worktop, and
// input boxes print as empty rectangles.
//
// Print behaviour lives in globals.css under @media print, keyed off the
// classes below. Keep the two in step.

export default function RecipeView({
  recipe,
  style,
  watermark = false,
  stepControls,
  heroControls,
}: {
  recipe: Recipe;
  style: CanvasStyle;
  /** Free tier prints with a footer credit; Pro prints clean. */
  watermark?: boolean;
  /**
   * Optional per-step and hero controls. Passed in rather than built in, so
   * the public /share page renders the identical document with no buttons on
   * it — a recipient has nothing to edit.
   */
  stepControls?: (stepId: string) => ReactNode;
  heroControls?: ReactNode;
}) {
  const total = totalMinutes(recipe);
  const meta: string[] = [];
  if (recipe.servings != null) meta.push(`Serves ${recipe.servings}`);
  if (recipe.prepMinutes != null) meta.push(`${recipe.prepMinutes} min prep`);
  if (recipe.cookMinutes != null) meta.push(`${recipe.cookMinutes} min cooking`);
  if (total != null && recipe.prepMinutes != null && recipe.cookMinutes != null) {
    meta.push(`${total} min total`);
  }

  return (
    <article
      id="print-view"
      className="recipe-canvas px-8 py-10"
      style={{ ...styleVars(style), fontSize: `${style.bodySize ?? BODY_SIZE_DEFAULT}px` }}
    >
      <header>
        <h1
          className="font-bold"
          style={{
            fontFamily: "var(--c-display)",
            fontSize: `${style.titleSize ?? TITLE_SIZE_DEFAULT}px`,
            lineHeight: 1.15,
          }}
        >
          {recipe.title}
        </h1>

        {recipe.description && (
          <p
            className="measure mt-3 italic"
            style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)", lineHeight: 1.6 }}
          >
            {recipe.description}
          </p>
        )}

        {(meta.length > 0 || recipe.source) && (
          <p
            className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm"
            style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)" }}
          >
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
            {recipe.source && <span>From {recipe.source}</span>}
          </p>
        )}
      </header>

      {/* Data URLs, so next/image has nothing to optimise — a plain img is the
          honest choice here. */}
      {recipe.content.heroImage && (
        <figure className="print-row mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.content.heroImage}
            alt={recipe.title}
            className="w-full rounded-lg"
            style={{ border: `1px solid var(--c-rule)` }}
          />
        </figure>
      )}

      {heroControls && <div className="no-print mt-3">{heroControls}</div>}

      {recipe.content.ingredientGroups.map((g) => (
        <section key={g.id} className="print-section mt-8">
          <h2
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
          >
            {g.heading || "Ingredients"}
          </h2>
          <ul className="mt-2">
            {g.items.map((i) => (
              <li
                key={i.id}
                className="print-row grid grid-cols-[6rem_1fr] gap-3 border-b py-1.5"
                style={{ fontFamily: "var(--c-body)", borderColor: "var(--c-rule)" }}
              >
                <span className="font-bold tabular-nums" style={{ color: "var(--c-qty)" }}>
                  {amount(i.quantity, i.unit)}
                </span>
                <span>
                  {i.name}
                  {i.note && <span style={{ color: "var(--c-muted)" }}>, {i.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {recipe.content.stepGroups.map((g) => (
        <section key={g.id} className="print-section mt-8">
          <h2
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
          >
            {g.heading || "Method"}
          </h2>
          <ol className="mt-3 space-y-3">
            {g.items.map((s, n) => (
              <li
                key={s.id}
                className="print-row measure flex gap-3"
                style={{ fontFamily: "var(--c-body)" }}
              >
                <span
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: "var(--c-accent)", color: "var(--c-bg)" }}
                >
                  {n + 1}
                </span>
                <span>
                  {s.text}
                  {s.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="mt-2 w-full max-w-sm rounded-lg"
                      style={{ border: `1px solid var(--c-rule)` }}
                    />
                  )}
                  {stepControls && <span className="no-print mt-2 block">{stepControls(s.id)}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {recipe.content.notes.length > 0 && (
        <section className="print-section mt-8">
          <h2
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
          >
            Notes
          </h2>
          <ul className="measure mt-2 space-y-1.5">
            {recipe.content.notes.map((n, i) => (
              <li
                key={i}
                className="print-row"
                style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)" }}
              >
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      {watermark && (
        <p
          className="print-only mt-10 text-center text-xs"
          style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)" }}
        >
          recipebookmaker.com
        </p>
      )}
    </article>
  );
}
