import type { CanvasStyle } from "@/lib/canvasStyle";
import { styleVars } from "@/lib/canvasStyle";

// A few lines of a recipe in the chosen style.
//
// The editor is app chrome — forms, grey rules, the interface font — and shows
// nothing of how the recipe will actually look. Picking a style there without
// this would be choosing blind, which is why the picker originally lived on
// the cook view instead.
//
// Deliberately not the whole recipe: it needs to show the type and the palette
// at a glance beside the button, not compete with the editor for the page.
//
// It shows the recipe's OWN first ingredient and first step. It used to show
// caster sugar and "stir until smooth" under a panel headed "for this recipe
// alone", which is a claim and a contradiction in the same box. Invented lines
// are kept only for a recipe that has nothing yet.

export default function StylePreview({
  style,
  title,
  amount,
  ingredient,
  step,
}: {
  style: CanvasStyle;
  title: string;
  /** The first ingredient's quantity and unit, already formatted. */
  amount?: string;
  ingredient?: string;
  step?: string;
}) {
  return (
    <div
      className="rounded-lg border border-rule p-4"
      // Capped as well as floored. With invented lines the content was always
      // short enough to sit beside the explanation; with the recipe's own step
      // it grew past the room in the flex row, wrapped onto its own line and
      // stretched into a strip. A preview of a page should stay page-shaped.
      style={{ ...styleVars(style), minWidth: "16rem", maxWidth: "22rem" }}
      aria-label="Preview of the recipe's style"
    >
      <p
        className="truncate text-lg font-bold"
        style={{ fontFamily: "var(--c-display)", lineHeight: 1.2 }}
      >
        {title || "Your recipe"}
      </p>
      <p
        className="mt-1 text-[10px] uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
      >
        Ingredients
      </p>
      <p
        className="mt-1 flex gap-3 border-b pb-1 text-sm"
        style={{ fontFamily: "var(--c-body)", borderColor: "var(--c-rule)" }}
      >
        <span className="font-bold tabular-nums" style={{ color: "var(--c-qty)" }}>
          {amount || "2 dl"}
        </span>
        <span className="truncate">{ingredient || "caster sugar"}</span>
      </p>
      <p
        className="mt-2 text-sm"
        style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)", lineHeight: 1.5 }}
      >
        <span className="line-clamp-2">{step || "Stir until smooth, then leave to cool."}</span>
      </p>
    </div>
  );
}
