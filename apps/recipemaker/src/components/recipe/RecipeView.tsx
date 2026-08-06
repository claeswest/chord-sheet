import type { Recipe } from "@/types/recipe";
import { totalMinutes } from "@/types/recipe";
import { type CanvasStyle, styleVars, amount } from "@/lib/canvasStyle";

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
}: {
  recipe: Recipe;
  style: CanvasStyle;
  /** Free tier prints with a footer credit; Pro prints clean. */
  watermark?: boolean;
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
    <article id="print-view" className="recipe-canvas px-8 py-10" style={styleVars(style)}>
      <header>
        <h1
          className="text-4xl font-bold"
          style={{ fontFamily: "var(--c-display)", lineHeight: 1.15 }}
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
                className="print-row grid grid-cols-[6rem_1fr] gap-3 border-b py-1.5 text-recipe"
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
                className="print-row measure flex gap-3 text-recipe"
                style={{ fontFamily: "var(--c-body)" }}
              >
                <span
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: "var(--c-accent)", color: "var(--c-bg)" }}
                >
                  {n + 1}
                </span>
                <span>{s.text}</span>
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
                className="print-row text-recipe"
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
