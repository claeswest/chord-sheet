import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import {
  AI_COST_USD,
  aiUsage,
  getAttention,
  getOverview,
  recentUsers,
  type Person,
} from "@/lib/adminData";
import { ago, billingLabel, day } from "@/lib/adminFormat";

// Read-only on purpose. This answers "what is happening" and offers no way to
// change anything — an admin panel that can edit customer records is a much
// larger thing to get right, and nothing here needs it yet.

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-card border border-rule bg-paper-raised p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="font-display mt-1 text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

/** One of the attention lists. Draws nothing when the list is empty. */
function Group({
  title,
  why,
  people,
}: {
  title: string;
  /** What to do about it, in a line. */
  why: string;
  people: (Person & { detail: string })[];
}) {
  if (people.length === 0) return null;
  return (
    <div className="rounded-card border border-rule bg-paper-raised p-4">
      <p className="text-sm font-semibold">
        {title} <span className="text-ink-faint">{people.length}</span>
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{why}</p>
      <ul className="mt-2 divide-y divide-rule/60 text-sm">
        {people.map((p) => (
          <li key={p.id} className="flex items-baseline gap-3 py-1.5">
            <Link href={`/admin/users/${p.id}`} className="min-w-0 truncate hover:underline">
              {p.name || p.email}
            </Link>
            <span className="ml-auto shrink-0 text-xs text-ink-muted">{p.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const usd = (n: number) => `$${n.toFixed(2)}`;

export default async function AdminOverview() {
  await requireAdmin();

  const [o, users, attention, ai] = await Promise.all([
    getOverview(),
    recentUsers(10),
    getAttention(),
    aiUsage(12),
  ]);

  const nothingToDo =
    attention.paymentProblems.length +
      attention.trialsEnding.length +
      attention.leaving.length +
      attention.neverStarted.length +
      attention.nearLimit.length ===
    0;

  // Weeks before the first one with anything in it are just empty rows.
  const lastUsed = ai.findLastIndex((w) => w.cost > 0);
  const weeks = ai.slice(0, Math.max(lastUsed + 1, 4));
  const aiTotal = ai.reduce((sum, w) => sum + w.cost, 0);

  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* First, because it is the number that decides whether any of the rest
            matters. Gross: the prices include VAT, so this is what customers
            pay, not what is banked. */}
        <Stat
          label="MRR (incl. VAT)"
          value={`$${o.mrr.gross}`}
          hint={o.mrr.inTrials > 0 ? `+$${o.mrr.inTrials} in trials` : "monthly recurring"}
        />
        <Stat label="People" value={o.users.total} hint={`${o.users.last7} in the last 7 days`} />
        <Stat
          label="Recipes"
          value={o.recipes.total}
          hint={
            o.users.total > 0
              ? `${(o.recipes.total / o.users.total).toFixed(1)} per person`
              : undefined
          }
        />
        <Stat
          label="Paying"
          value={o.plans.monthly + o.plans.yearly}
          hint={`${o.plans.monthly} monthly · ${o.plans.yearly} yearly`}
        />
        <Stat
          label="In trial"
          value={o.subscriptions.trialing}
          hint={o.subscriptions.leaving > 0 ? `${o.subscriptions.leaving} leaving` : "none leaving"}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="With a picture" value={o.recipes.withPicture} />
        <Stat label="Shared links" value={o.recipes.shared} />
        <Stat label="New this month" value={o.users.last30} />
      </section>

      <h2 className="font-display mt-10 text-xl font-bold">Needs attention</h2>
      {nothingToDo ? (
        <p className="mt-3 text-sm text-ink-faint">
          Nobody right now: no failed payments, no trial about to charge, nobody leaving, nobody
          stuck at the start or near the free limit.
        </p>
      ) : (
        <div className="mt-3 grid items-start gap-4 sm:grid-cols-2">
          <Group
            title="Payment failed"
            why="Stripe is retrying. A note from you often gets the card fixed."
            people={attention.paymentProblems.map((p) => ({ ...p, detail: p.status }))}
          />
          <Group
            title="Trial charges soon"
            why="The best days to write and ask how it is going."
            people={attention.trialsEnding.map((p) => ({ ...p, detail: `charged ${day(p.at)}` }))}
          />
          <Group
            title="Leaving"
            why="Cancelled, access still running. Worth asking why."
            people={attention.leaving.map((p) => ({ ...p, detail: `until ${day(p.at)}` }))}
          />
          <Group
            title="Signed up, no recipe yet"
            why="In the last two weeks. The product has not shown them anything."
            people={attention.neverStarted.map((p) => ({ ...p, detail: `joined ${ago(p.joined)}` }))}
          />
          <Group
            title="Near the free limit"
            why="The moment the upgrade is worth mentioning."
            people={attention.nearLimit.map((p) => ({
              ...p,
              detail: attention.limit ? `${p.recipes} of ${attention.limit}` : `${p.recipes}`,
            }))}
          />
        </div>
      )}

      <div className="mt-10 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold">Recent signups</h2>
        <Link href="/admin/users" className="text-sm text-ink-muted hover:text-ink">
          All people →
        </Link>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs uppercase tracking-[0.14em] text-ink-faint">
              <th className="py-2 pr-4 font-normal">Person</th>
              <th className="py-2 pr-4 font-normal">Joined</th>
              <th className="py-2 pr-4 font-normal">Recipes</th>
              <th className="py-2 font-normal">Billing</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-rule/60">
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                    {u.name || u.email}
                  </Link>
                  {u.name && <span className="block text-xs text-ink-faint">{u.email}</span>}
                </td>
                <td className="py-2 pr-4 text-ink-muted">{day(u.createdAt)}</td>
                {/* Zero is the number worth seeing: someone who signed up and
                    never wrote anything is the product failing, not the person. */}
                <td className={`py-2 pr-4 ${u.recipes === 0 ? "text-ink-faint" : "text-ink"}`}>
                  {u.recipes}
                </td>
                <td className="py-2 text-ink-muted">{billingLabel(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && <p className="mt-4 text-sm text-ink-faint">Nobody has signed up yet.</p>}

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="font-display text-xl font-bold">AI use, by week</h2>
        <p className="text-sm text-ink-muted">about {usd(aiTotal)} in twelve weeks</p>
      </div>
      {aiTotal === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">Nothing in the last twelve weeks.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-rule text-left text-xs uppercase tracking-[0.14em] text-ink-faint">
                <th className="py-2 pr-4 font-normal">Week of</th>
                <th className="py-2 pr-4 font-normal">People</th>
                <th className="py-2 pr-4 font-normal">Imports</th>
                <th className="py-2 pr-4 font-normal">Visitor tries</th>
                <th className="py-2 pr-4 font-normal">Checks</th>
                <th className="py-2 pr-4 font-normal">Styles</th>
                <th className="py-2 pr-4 font-normal">Pictures</th>
                <th className="py-2 text-right font-normal">About</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const n = (v: number) =>
                  v === 0 ? <span className="text-ink-faint">–</span> : v;
                return (
                  <tr key={w.start.getTime()} className="border-b border-rule/60">
                    <td className="py-2 pr-4 text-ink-muted">{day(w.start)}</td>
                    <td className="py-2 pr-4">{n(w.people)}</td>
                    <td className="py-2 pr-4">
                      {n(w.counts.import)}
                      {w.photos > 0 && (
                        <span className="text-xs text-ink-faint"> · {w.photos} from photos</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{n(w.counts.tried)}</td>
                    <td className="py-2 pr-4">{n(w.counts.check)}</td>
                    <td className="py-2 pr-4">{n(w.counts.style)}</td>
                    <td className="py-2 pr-4">{n(w.counts.picture)}</td>
                    <td className="py-2 text-right text-ink-muted">
                      {w.cost === 0 ? <span className="text-ink-faint">–</span> : usd(w.cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* The three ways this number is wrong, said where it is shown. */}
      <p className="mt-3 max-w-2xl text-xs text-ink-faint">
        An estimate, not the bill: about ${AI_COST_USD.import} for an import or a check, $
        {AI_COST_USD.style} for a style and ${AI_COST_USD.picture} for a picture. Only requests
        that succeeded are counted, so the real figure is somewhat higher. “People” are accounts;
        visitors trying the paste box are not counted there.
      </p>
    </>
  );
}
