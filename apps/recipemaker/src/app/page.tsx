import { emptyContent, totalMinutes, type Recipe } from "@/types/recipe";

// Scaffold page. Not the landing page — it renders one hard-coded recipe
// through the real domain types, so the model gets exercised before any
// database exists. The markup here is the seed of the recipe viewer.

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

function Quantity({ q, unit }: { q: number | null; unit: string }) {
  if (q == null) return <span className="text-stone-400">—</span>;
  // 0.5 reads better than "0.5" in a recipe.
  const pretty = q === 0.5 ? "½" : q === 0.25 ? "¼" : String(q);
  return <span className="tabular-nums">{pretty}{unit && ` ${unit}`}</span>;
}

export default function Page() {
  const r = SAMPLE;
  const total = totalMinutes(r);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-stone-400">RecipeMaker · scaffold</p>

      <h1 className="mt-4 text-4xl font-extrabold" style={{ fontFamily: "var(--font-nunito)" }}>
        {r.title}
      </h1>
      {r.description && <p className="mt-3 text-stone-600">{r.description}</p>}

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-stone-600">
        {r.servings != null && (
          <div><dt className="inline text-stone-400">Serves </dt><dd className="inline font-medium">{r.servings}</dd></div>
        )}
        {r.prepMinutes != null && (
          <div><dt className="inline text-stone-400">Prep </dt><dd className="inline font-medium">{r.prepMinutes} min</dd></div>
        )}
        {r.cookMinutes != null && (
          <div><dt className="inline text-stone-400">Cook </dt><dd className="inline font-medium">{r.cookMinutes} min</dd></div>
        )}
        {total != null && (
          <div><dt className="inline text-stone-400">Total </dt><dd className="inline font-medium">{total} min</dd></div>
        )}
      </dl>

      {r.content.ingredientGroups.map((g) => (
        <section key={g.id} className="mt-10">
          <h2 className="text-lg font-bold">{g.heading || "Ingredients"}</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {g.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-2">
                <span className="w-24 shrink-0 text-stone-500"><Quantity q={i.quantity} unit={i.unit} /></span>
                <span>
                  {i.name}
                  {i.note && <span className="text-stone-400">, {i.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {r.content.stepGroups.map((g) => (
        <section key={g.id} className="mt-10">
          <h2 className="text-lg font-bold">{g.heading || "Method"}</h2>
          <ol className="mt-3 space-y-4">
            {g.items.map((s, n) => (
              <li key={s.id} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
                  {n + 1}
                </span>
                <p>
                  {s.text}
                  {s.temperatureC != null && <span className="text-stone-500"> ({s.temperatureC} °C)</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {r.content.notes.length > 0 && (
        <section className="mt-10 rounded-xl bg-stone-50 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Notes</h2>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {r.content.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}

      {r.source && <p className="mt-10 text-sm text-stone-400">From {r.source}</p>}
    </main>
  );
}
