import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { planFromUser, PLANS, Plan, canUseFeature, isOnTrial, trialDaysRemaining, yearlySavingPercent } from "@/lib/plans";
import { syncStaleSubscription } from "@/lib/stripeSync";
import { cancellationPending } from "@clavos/core/billing";
import BuildStamp from "@clavos/core/build-stamp";
import UserMenu from "@/components/ui/UserMenu";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Wordmark } from "@/components/landing/kit";
import ManageSubscriptionButton from "@/components/ui/ManageSubscriptionButton";

const FEATURE_ROWS: { key: Parameters<typeof canUseFeature>[1]; label: string }[] = [
  { key: "pdfExport",       label: "PDF export"          },
  { key: "sharing",         label: "Public sharing"      },
  { key: "setlists",        label: "Setlists & folders"  },
  { key: "chordTranspose",  label: "Chord transposition" },
  { key: "prioritySupport", label: "Priority support"    },
];

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, songCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, image: true, plan: true,
        stripeSubscriptionId: true, stripeCurrentPeriodEnd: true,
        stripeSubscriptionStatus: true, stripeCancelAt: true, createdAt: true,
      },
    }),
    prisma.song.count({ where: { userId: session.user.id } }),
  ]);

  if (!user) redirect("/login");

  // Self-heal: if the stored subscription period has passed (e.g. a missed
  // trial→active webhook), reconcile with Stripe before rendering.
  const synced = await syncStaleSubscription(user);
  if (synced) Object.assign(user, synced);

  const plan = planFromUser(user) as Plan;
  const planConfig = PLANS[plan];
  const isPaid = plan !== "free";
  const onTrial = isOnTrial(user);
  const daysLeft = trialDaysRemaining(user);
  const songLimit = planConfig.features.songLimit;

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const renewsOn = user.stripeCurrentPeriodEnd
    ? new Date(user.stripeCurrentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : null;

  // Cancelled but still inside the paid-up period. Stripe keeps the status
  // "active" (or "trialing") and the plan unchanged until the end, so neither
  // says it — only stripeCancelAt does. This page used to ignore it and told a
  // cancelled subscriber "Next renewal: Nov 29" and offered them an upgrade.
  const leaving = isPaid && cancellationPending(user.stripeCancelAt);
  const endsOn = leaving
    ? new Date(user.stripeCancelAt!).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : null;

  const unlimitedSongs = planConfig.features.songLimit === true;
  const activeFeatures = [
    ...(unlimitedSongs ? [{ key: "songLimit" as const, label: "Unlimited songs" }] : []),
    ...FEATURE_ROWS.filter(({ key }) => canUseFeature(plan, key)),
  ];
  const lockedFeatures = [
    ...(!unlimitedSongs ? [{ key: "songLimit" as const, label: "Unlimited songs" }] : []),
    ...FEATURE_ROWS.filter(({ key }) => !canUseFeature(plan, key)),
  ];

  return (
    <div className={`${LANDING_FONTS} min-h-screen bg-paper text-ink`}>

      {/* ── Nav — matches /songs ────────────────────────────────────────── */}
      <header className="bg-paper border-b border-rule flex items-center px-4 sm:px-6 h-14 shrink-0">
        <Link href="/" aria-label="ChordSheetMaker — home"><Wordmark className="text-xl" /></Link>
        <div className="w-px h-5 bg-ink/15 mx-4" />
        <Link href="/songs" className="text-sm text-stone-600 hover:text-ink transition-colors">
          ← My songs
        </Link>
        <div className="flex-1" />
        <UserMenu userName={user.name} userImage={user.image} tone="paper" />
      </header>

      {/* ── Who you are, and the two numbers that matter ─────────────────── */}
      <div className="bg-paper-deep border-b border-rule">
        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center gap-6">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} referrerPolicy="no-referrer" className="w-20 h-20 rounded-full ring-1 ring-ink/15 shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-ink flex items-center justify-center text-paper text-3xl font-display shrink-0">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-2">
              {planConfig.name} plan
            </p>
            <h1 className="font-display font-medium text-4xl tracking-[-0.02em] leading-tight text-ink break-words">
              {user.name ?? "—"}
            </h1>
            <p className="text-stone-600 text-sm mt-1 break-all">{user.email}</p>
            <p className="font-mono text-[11px] text-stone-500 mt-2">Member since {memberSince}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 pb-8 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white border border-rule px-5 py-4">
            <div className="font-display text-4xl text-ink tabular-nums leading-none">{songCount}</div>
            <div className="text-xs text-stone-600 mt-2">
              {songLimit === true ? "Songs created" : `Songs · ${songLimit} max`}
            </div>
          </div>
          <div className="rounded-lg bg-white border border-rule px-5 py-4">
            <div className="font-display text-4xl text-ink leading-none">{planConfig.name}</div>
            <div className="text-xs text-stone-600 mt-2">
              {leaving ? `Ends ${endsOn}` : isPaid ? `$${planConfig.price}/mo` : "Free plan"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pt-5 pb-16 space-y-4">

        {/* Plan card */}
        <div className="bg-white rounded-xl border border-rule overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Your plan</h2>
            <div className="flex items-center gap-2">
              {leaving && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600">
                  Cancelled
                </span>
              )}
              {onTrial && !leaving && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Trial — {daysLeft}d left
                </span>
              )}
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                isPaid ? "bg-paper-deep text-chord" : "bg-zinc-100 text-zinc-500"
              }`}>
                {planConfig.name}
              </span>
            </div>
          </div>

          {/* Cancellation notice — replaces the trial notice, whose "cancel
              anytime" would read as an invitation to do what's already done. */}
          {leaving && (
            <div className="mx-6 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <span className="text-lg">👋</span>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Your subscription is cancelled
                </p>
                <p className="text-xs text-red-700/80 mt-0.5">
                  You keep everything in {planConfig.name} until {endsOn}, and you won&apos;t be charged
                  again. After that your account moves to the Free plan. Changed your mind? You can
                  resume it under Manage subscription.
                </p>
              </div>
            </div>
          )}

          {/* Trial notice */}
          {onTrial && !leaving && (
            <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Your free trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  You won&apos;t be charged until your trial ends. Cancel anytime before then.
                </p>
              </div>
            </div>
          )}

          {/* Active features */}
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
            {activeFeatures.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs shrink-0 bg-paper-deep text-chord font-bold">✓</span>
                {label}
              </div>
            ))}
          </div>

          {/* Locked features — free plan upsell */}
          {!isPaid && lockedFeatures.length > 0 && (
            <div className="mx-6 mb-4 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 px-4 py-3">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Unlock with Pro</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {lockedFeatures.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs shrink-0 bg-zinc-100 text-zinc-300">—</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing / CTA */}
          {isPaid ? (
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 space-y-2.5 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Price</span>
                <span className="font-semibold text-zinc-900">
                  {onTrial ? "Free during trial" : `$${planConfig.price}${plan === "monthly" ? "/mo" : "/yr"}`}
                </span>
              </div>
              {leaving ? (
                <div className="flex justify-between text-zinc-500">
                  <span>Access ends</span>
                  <span className="font-semibold text-red-600">{endsOn}</span>
                </div>
              ) : renewsOn && (
                <div className="flex justify-between text-zinc-500">
                  <span>{onTrial ? "Trial ends" : "Next renewal"}</span>
                  <span className="font-semibold text-zinc-900">{renewsOn}</span>
                </div>
              )}
              {/* Upgrade to yearly upsell for monthly subscribers — not for
                  someone who has just cancelled. */}
              {plan === "monthly" && !onTrial && !leaving && (
                <div className="pt-1 flex items-center justify-between gap-4 border-t border-zinc-200 mt-2">
                  <p className="text-xs text-zinc-500 leading-snug">
                    Save {yearlySavingPercent()}% and get priority support with the yearly plan.
                  </p>
                  <Link
                    href="/pricing"
                    className="shrink-0 bg-ink hover:bg-stone-700 text-paper text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Upgrade to yearly →
                  </Link>
                </div>
              )}
              {/* Manage / cancel */}
              <div className="pt-1 flex items-center justify-between gap-4 border-t border-zinc-200 mt-2">
                <p className="text-xs text-zinc-400 leading-snug">
                  {leaving
                    ? "Resume your subscription, update payment method or view invoices."
                    : "Update payment method, view invoices or cancel your subscription."}
                </p>
                <ManageSubscriptionButton />
              </div>
            </div>
          ) : (
            <div
              className="px-6 py-5 border-t border-rule bg-paper flex items-center justify-between gap-4"
            >
              <p className="text-sm text-zinc-600 leading-snug">
                Unlock unlimited songs, PDF export, sharing and more.
              </p>
              <Link
                href="/pricing"
                className="shrink-0 bg-ink hover:bg-stone-700 text-paper text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade →
              </Link>
            </div>
          )}
        </div>

        {/* Account card */}
        <div className="bg-white rounded-xl border border-rule overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Account</h2>
          </div>
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-700">Sign out</p>
              <p className="text-xs text-zinc-400 mt-0.5">Returns you to the login page</p>
            </div>
            <a
              href="/api/auth/signout"
              className="shrink-0 text-sm border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-full font-medium transition-colors"
            >
              Sign out
            </a>
          </div>
        </div>

        {/* Build info — handy for confirming the latest deploy is live */}
        <p className="text-center text-[11px] text-zinc-300 mt-6">
          <BuildStamp className="font-mono" />
        </p>
      </div>
    </div>
  );
}
