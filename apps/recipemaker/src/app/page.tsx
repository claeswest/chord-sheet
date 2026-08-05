import Link from "next/link";
import { emptyContent, totalMinutes, type Recipe } from "@/types/recipe";

// Scaffold page — not the landing page yet.
//
// It renders one hard-coded recipe in the DEFAULT CANVAS STYLE. Note the
// canvas uses its own --c-* variables rather than the chrome tokens: a recipe
// is styled per recipe from Recipe.style, and this is what it looks like
// before the AI runs, if generation fails, or if the user turns styling off.
// See design/canvas/spec.html.

const SAMPLE: Recipe = {
  id: "sample",
  title: "Mormors pannkakor",
  description: "The thin Swedish kind. The batter wants to rest — that's the whole trick.",
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 20,
  source: "Mormor Karin",
  createdAt: new Date(),
  updatedAt: new Date(),
  content: {
    ...emptyContent(),
    ingredientGroups: [
      {
        id: "g1",
        heading: "",
        items: [
          { id: "i1", quantity: 3, unit: "dl", name: "plain flour" },
          { id: "i2", quantity: 0.5, unit: "tsp", name: "salt" },
          { id: "i3", quantity: 6, unit: "dl", name: "milk" },
          { id: "i4", quantity: 3, unit: "", name: "eggs", note: "lightly beaten" },
          { id: "i5", quantity: 50, unit: "g", name: "butter", note: "melted" },
        ],
      },
    ],
    stepGroups: [
      {
        id: "s1",
        heading: "",
        items: [
          { id: "t1", text: "Whisk the flour, salt and half the milk to a smooth batter." },
          { id: "t2", text: "Add the rest of the milk and the eggs. Stir in the melted butter." },
          { id: "t3", text: "Let it rest 30 minutes — this is what makes them thin.", minutes: 30 },
          { id: "t4", text: "Fry thin in a hot buttered pan until golden at the edges." },
        ],
      },
    ],
    notes: ["Serve with lingonberry jam.", "Batter keeps overnight in the fridge."],
  },
};

/** ½ and ¼ read better than 0.5 and 0.25 in a recipe. */
function Quantity({ q, unit }: { q: number | null; unit: string }) {
  if (q == null) return <span style={{ color: "var(--c-muted)" }}>—</span>;
  const pretty = q === 0.5 ? "½" : q === 0.25 ? "¼" : q === 0.75 ? "¾" : String(q);
  return (
    <span style={{ color: "var(--c-qty)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      {pretty}
      {unit && ` ${unit}`}
    </span>
  );
}

export default function Page() {
  const r = SAMPLE;
  const total = totalMinutes(r);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Chrome */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-ink-faint">
          RecipeBookMaker · scaffold
        </p>
        <Link href="/recipes" className="text-sm text-ink-muted hover:text-ink">
          Your recipes →
        </Link>
      </div>

      {/* Canvas — its own variables, deliberately not the chrome tokens. */}
      <article
        className="rounded-card border border-rule p-10 shadow-card"
        style={
          {
            "--c-bg": "#f4ece0",
            "--c-ink": "#3b2f24",
            "--c-muted": "#7a6a58",
            "--c-accent": "#9c5b34",
            "--c-qty": "#6c7f52",
            "--c-rule": "#ddd0bd",
            "--c-display": '"Iowan Old Style", Georgia, serif',
            "--c-body": "Georgia, serif",
            background: "var(--c-bg)",
            color: "var(--c-ink)",
          } as React.CSSProperties
        }
      >
        <h1
          className="text-4xl font-bold"
          style={{ fontFamily: "var(--c-display)", lineHeight: 1.2 }}
        >
          {r.title}
        </h1>
        {r.description && (
          <p
            className="measure mt-3 text-lg italic"
            style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)", lineHeight: 1.65 }}
          >
            {r.description}
          </p>
        )}

        <dl
          className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-y py-4 text-sm"
          style={{ borderColor: "var(--c-rule)" }}
        >
          {[
            ["Serves", r.servings],
            ["Prep", r.prepMinutes && `${r.prepMinutes} min`],
            ["Cook", r.cookMinutes && `${r.cookMinutes} min`],
            ["Total", total && `${total} min`],
          ].map(([label, value]) =>
            value ? (
              <div key={String(label)}>
                <dt
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "var(--c-muted)" }}
                >
                  {label}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>

        {r.content.ingredientGroups.map((g) => (
          <section key={g.id} className="mt-8">
            <h2
              className="text-xs uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
            >
              {g.heading || "Ingredients"}
            </h2>
            <ul className="mt-3">
              {g.items.map((i) => (
                <li
                  key={i.id}
                  className="grid grid-cols-[5.5rem_1fr] gap-4 border-b py-2 text-lg"
                  style={{ fontFamily: "var(--c-body)", borderColor: "var(--c-rule)" }}
                >
                  <Quantity q={i.quantity} unit={i.unit} />
                  <span>
                    {i.name}
                    {i.note && <span style={{ color: "var(--c-muted)" }}>, {i.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {r.content.stepGroups.map((g) => (
          <section key={g.id} className="mt-8">
            <h2
              className="text-xs uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--c-display)", color: "var(--c-accent)" }}
            >
              {g.heading || "Method"}
            </h2>
            <ol className="mt-3 space-y-4">
              {g.items.map((s, n) => (
                <li
                  key={s.id}
                  className="measure flex gap-4 text-lg"
                  style={{ fontFamily: "var(--c-body)", lineHeight: 1.65 }}
                >
                  <span
                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--c-accent)", color: "var(--c-bg)" }}
                  >
                    {n + 1}
                  </span>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {r.content.notes.length > 0 && (
          <section
            className="mt-8 rounded-xl p-5"
            style={{ background: "rgb(0 0 0 / 0.03)", fontFamily: "var(--c-body)" }}
          >
            <h2
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--c-muted)" }}
            >
              Notes
            </h2>
            <ul className="mt-2 space-y-1">
              {r.content.notes.map((n, i) => (
                <li key={i} style={{ color: "var(--c-muted)" }}>
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.source && (
          <p className="mt-8 italic" style={{ fontFamily: "var(--c-body)", color: "var(--c-muted)" }}>
            From {r.source}
          </p>
        )}
      </article>
    </main>
  );
}
