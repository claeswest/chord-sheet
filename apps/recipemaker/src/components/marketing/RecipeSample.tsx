import type { Recipe } from "@/types/recipe";

// A recipe rendered in a canvas style — used on the landing page to show the
// product rather than describe it. Styling comes in as --c-* variables, exactly
// as it will when the AI generates them per recipe (design/canvas/spec.html).

export type CanvasStyle = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  qty: string;
  rule: string;
  display: string;
  body: string;
};

export const HEIRLOOM: CanvasStyle = {
  bg: "#f4ece0", ink: "#3b2f24", muted: "#7a6a58", accent: "#9c5b34",
  qty: "#6c7f52", rule: "#ddd0bd",
  display: '"Iowan Old Style", Georgia, serif', body: "Georgia, serif",
};

export const NORDIC: CanvasStyle = {
  bg: "#f7f7f5", ink: "#22252a", muted: "#6b7280", accent: "#5b7a8c",
  qty: "#3f6b4f", rule: "#e3e3e0",
  display: "ui-sans-serif, system-ui, sans-serif", body: "ui-sans-serif, system-ui, sans-serif",
};

export const BOTANICAL: CanvasStyle = {
  bg: "#eef2ea", ink: "#1f2a20", muted: "#5c6b58", accent: "#3f6b4f",
  qty: "#8a5a2b", rule: "#d6dfd2",
  display: "Georgia, serif", body: "Georgia, serif",
};

function styleVars(s: CanvasStyle): React.CSSProperties {
  return {
    "--c-bg": s.bg, "--c-ink": s.ink, "--c-muted": s.muted, "--c-accent": s.accent,
    "--c-qty": s.qty, "--c-rule": s.rule, "--c-display": s.display, "--c-body": s.body,
    background: "var(--c-bg)", color: "var(--c-ink)",
  } as React.CSSProperties;
}

/** ½ reads better than 0.5 on a recipe. */
function pretty(q: number): string {
  return q === 0.5 ? "½" : q === 0.25 ? "¼" : q === 0.75 ? "¾" : String(q);
}

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
