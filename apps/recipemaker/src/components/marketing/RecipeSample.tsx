import type { Recipe } from "@/types/recipe";
import { type CanvasStyle, styleVars, pretty } from "@/lib/canvasStyle";

// A recipe rendered in a canvas style — used on the landing page to show the
// product rather than describe it. Deliberately a cut-down preview: it reads
// only the first group and can truncate. The real thing is RecipeView.
//
// The style presets and the --c-* contract live in lib/canvasStyle.ts, since
// the cook view and the style generator need them too.


export default function RecipeSample({
  recipe,
  style,
  compact = false,
  className = "",
}: {
  recipe: Recipe;
  style: CanvasStyle;
  compact?: boolean;
  className?: string;
}) {
  const ings = recipe.content.ingredientGroups[0]?.items ?? [];
  const steps = recipe.content.stepGroups[0]?.items ?? [];

  return (
    <article className={className} style={styleVars(style)}>
      <h3
        className={compact ? "text-xl font-bold" : "text-3xl font-bold"}
        style={{ fontFamily: "var(--c-display)", lineHeight: 1.2 }}
      >
        {recipe.title}
      </h3>
      {recipe.description && !compact && (
        <p
          className="mt-2 italic"
          style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)", lineHeight: 1.6 }}
        >
          {recipe.description}
        </p>
      )}

      <p
        className="mt-5 text-[11px] uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
      >
        Ingredients
      </p>
      <ul className="mt-2">
        {(compact ? ings.slice(0, 3) : ings).map((i) => (
          <li
            key={i.id}
            className={`grid gap-3 border-b py-1.5 ${compact ? "grid-cols-[3.5rem_1fr] text-sm" : "grid-cols-[5rem_1fr] text-lg"}`}
            style={{ fontFamily: "var(--c-body)", borderColor: "var(--c-rule)" }}
          >
            <span
              className="font-bold tabular-nums"
              style={{ color: "var(--c-qty)" }}
            >
              {i.quantity == null ? "—" : `${pretty(i.quantity)}${i.unit ? ` ${i.unit}` : ""}`}
            </span>
            <span>
              {i.name}
              {i.note && !compact && <span style={{ color: "var(--c-muted)" }}>, {i.note}</span>}
            </span>
          </li>
        ))}
      </ul>

      <p
        className="mt-5 text-[11px] uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
      >
        Method
      </p>
      <ol className={compact ? "mt-2 space-y-1.5" : "mt-3 space-y-3"}>
        {(compact ? steps.slice(0, 2) : steps).map((s, n) => (
          <li
            key={s.id}
            className={`flex gap-3 ${compact ? "text-sm" : "text-lg"}`}
            style={{ fontFamily: "var(--c-body)", lineHeight: 1.6 }}
          >
            <span
              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${compact ? "h-5 w-5" : "h-6 w-6"}`}
              style={{ background: "var(--c-accent)", color: "var(--c-bg)" }}
            >
              {n + 1}
            </span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
