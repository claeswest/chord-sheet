import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatPrice, planFromUser, type Plan } from "@/lib/plans";
import { canBuyPlan } from "@/lib/stripe";
import PlanButton from "@/components/billing/PlanButton";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with 10 recipes. Upgrade for unlimited recipes, clean printing and sharing. From $5 a month, 7-day free trial.",
};

// The feature rows are written here, but what each tier ACTUALLY allows comes
// from plans.ts — the same object the paywalls and server-side gates read. A
// pricing page that promises something the gate refuses is the worst kind of
// bug, so the ticks are computed, never typed in.
const ROWS: { label: string; key: keyof (typeof PLANS)["free"]["features"] }[] = [
  { label: "Recipes", key: "recipeLimit" },
  { label: "AI import from any text", key: "aiImport" },
  { label: "Collections", key: "collections" },
  { label: "Print without the footer credit", key: "pdfExport" },
  { label: "Share a recipe by link", key: "sharing" },
];

function cell(key: string, value: boolean | number): string {
  // recipeLimit is the one row where `true` means "no limit" rather than
  // "included" — rendering it as "Yes" reads as a missing number.
  if (key === "recipeLimit") return value === true ? "Unlimited" : String(value);
  return value === true ? "Yes" : value === false ? "—" : String(value);
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const session = await auth();

  let current: Plan = "free";
  let hasCustomer = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      current = planFromUser(user);
      hasCustomer = Boolean(user.stripeCustomerId);
    }
  }

  const paid: Plan[] = ["monthly", "yearly"];

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-center text-4xl font-extrabold">Pricing</h1>
      <p className="font-body mt-3 text-center text-recipe text-ink-muted">
        Start free. Upgrade when your recipe book outgrows it.
      </p>

      {success && (
        <p className="mt-8 rounded-card bg-herb-soft p-4 text-center text-sm">
          Thank you — your subscription is active. It can take a moment to show below.
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(["free", ...paid] as Plan[]).map((key) => {
          const p = PLANS[key];
          // Only a signed-in user has a current plan. `current` defaults to
          // "free", so without this a visitor is told the free tier is already
          // theirs and is given no way to start.
          const isCurrent = Boolean(session?.user?.id) && current === key;
          return (
            <section
              key={key}
              className={`rounded-card border bg-paper-raised p-6 shadow-card ${
                isCurrent ? "border-accent" : "border-rule"
              }`}
            >
              <h2 className="font-display text-xl font-bold">{p.name}</h2>
              <p className="mt-2">
                <span className="font-display text-3xl font-extrabold">
                  {formatPrice(p.price)}
                </span>
                {p.isRecurring && (
                  <span className="text-sm text-ink-muted">
                    {key === "yearly" ? " / year" : " / month"}
                  </span>
                )}
              </p>
              {p.isRecurring && <p className="text-xs text-ink-faint">VAT included</p>}
              <p className="mt-1 text-sm text-ink-faint">{p.description}</p>

              <ul className="font-body mt-5 space-y-1.5 text-sm">
                {ROWS.map((r) => (
                  <li key={r.key} className="flex justify-between gap-3">
                    <span className="text-ink-muted">{r.label}</span>
                    <span className="font-semibold">{cell(r.key, p.features[r.key])}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <p className="rounded-full bg-paper-sunken px-5 py-3 text-center text-sm font-semibold text-ink-muted">
                    Your plan
                  </p>
                ) : key === "free" ? (
                  <Link
                    href={session?.user?.id ? "/recipes" : "/login"}
                    className="block rounded-full border border-rule px-5 py-3 text-center text-sm font-semibold hover:bg-paper-sunken"
                  >
                    {session?.user?.id ? "Go to your recipes" : "Start free"}
                  </Link>
                ) : !session?.user?.id ? (
                  <Link
                    href="/login"
                    className="block rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-paper-raised"
                  >
                    Sign in to upgrade
                  </Link>
                ) : canBuyPlan(p.stripePriceId) ? (
                  <PlanButton plan={key} mode="checkout" label="Start 7-day trial" />
                ) : (
                  <p className="text-center text-sm text-ink-faint">Not available yet</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {hasCustomer && (
        <div className="mx-auto mt-10 max-w-xs">
          <PlanButton mode="portal" label="Manage subscription" />
          <p className="mt-2 text-center text-xs text-ink-faint">
            Change plan, update your card, or cancel.
          </p>
        </div>
      )}

      <p className="font-body mt-12 text-center text-sm text-ink-muted">
        Free includes {PLANS.free.features.recipeLimit} recipes and full AI import — the part
        worth trying before you pay. Cancel any time; you keep access until the period ends.
      </p>
    </main>
  );
}
