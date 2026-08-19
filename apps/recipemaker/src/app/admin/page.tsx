import Link from "next/link";
import { getOverview, recentUsers } from "@/lib/adminData";
import { cancellationPending } from "@clavos/core/billing";

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

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** What a row's billing actually means, in words rather than four columns. */
function billingLabel(u: {
  plan: string;
  status: string | null;
  cancelAt: Date | null;
  periodEnd: Date | null;
}): string {
  if (u.plan === "free") return "Free";
  if (cancellationPending(u.cancelAt)) return `Leaving ${day(u.cancelAt!)}`;
  if (u.status === "trialing") return `Trial to ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  if (u.status === "active") return `Paying · renews ${u.periodEnd ? day(u.periodEnd) : "?"}`;
  return u.status ?? u.plan;
}

export default async function AdminOverview() {
  const [o, users] = await Promise.all([getOverview(), recentUsers(10)]);

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
                  <span className="font-medium">{u.name || "—"}</span>
                  <span className="block text-xs text-ink-faint">{u.email}</span>
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
    </>
  );
}
