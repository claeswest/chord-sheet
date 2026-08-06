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

export default function StylePreview({ style, title }: { style: CanvasStyle; title: string }) {
  return (
    <div
      className="rounded-lg border border-rule p-4"
      style={{ ...styleVars(style), minWidth: "16rem" }}
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
          2 dl
        </span>
        <span>double cream</span>
      </p>
      <p
        className="mt-2 text-sm"
        style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)", lineHeight: 1.5 }}
      >
        Simmer gently until it coats the back of a spoon.
      </p>
    </div>
  );
}
