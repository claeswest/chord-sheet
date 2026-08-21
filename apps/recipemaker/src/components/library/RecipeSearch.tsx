import Link from "next/link";

// Search, as a plain GET form.
//
// No client component and no debounced fetching: the result is a URL, which
// can be bookmarked, sent to yourself, and reloaded. It also works before the
// JavaScript arrives, which matters on a phone in a kitchen.
//
// The collection is carried through as a hidden field so searching inside a
// collection stays inside it — losing the shelf you were standing at is the
// obvious way to get this wrong.

export default function RecipeSearch({
  q,
  collection,
}: {
  q: string;
  collection?: string;
}) {
  return (
    <form className="flex gap-2">
      {collection && <input type="hidden" name="collection" value={collection} />}
      <input
        name="q"
        defaultValue={q}
        placeholder="Search your recipes…"
        aria-label="Search your recipes"
        className="w-56 rounded-full border border-rule bg-paper-raised px-4 py-1.5 text-sm focus:border-ink focus:outline-none"
      />
      <button className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold hover:bg-paper-sunken">
        Search
      </button>
      {q && (
        <Link
          href={collection ? `/recipes?collection=${collection}` : "/recipes"}
          className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
