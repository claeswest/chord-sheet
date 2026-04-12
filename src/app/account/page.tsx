import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { planFromUser, PLANS, Plan, canUseFeature, isOnTrial, trialDaysRemaining } from "@/lib/plans";
import UserMenu from "@/components/ui/UserMenu";

const FEATURE_ROWS: { key: Parameters<typeof canUseFeature>[1]; label: string }[] = [
  { key: "songLimit",       label: "Unlimited songs"     },
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
        name: true, email: true, image: true, plan: true,
        stripeSubscriptionId: true, stripeCurrentPeriodEnd: true,
        stripeSubscriptionStatus: true, createdAt: true,
      },
    }),
    prisma.song.count({ where: { userId: session.user.id } }),
  ]);

  if (!user) redirect("/login");

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

  const activeFeatures = FEATURE_ROWS.filter(({ key }) => canUseFeature(plan, key));
  const lockedFeatures = FEATURE_ROWS.filter(({ key }) => !canUseFeature(plan, key));

  return (
    <div className="min-h-screen" style={{ background: "#f0f0f5" }}>

      {/* ── Nav — solid bar, matches /songs exactly ─────────────────────── */}
      <header className="bg-[#302b63] border-b border-white/10 flex items-center px-6 h-14 shrink-0">
        <Link href="/" className="text-sm font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-nunito)" }}>
          ChordSheet<span className="text-indigo-400">Maker</span>
        </Link>
        <div className="w-px h-5 bg-white/20 mx-4" />
        <Link href="/songs" className="text-sm text-white/60 hover:text-white transition-colors">
          ← My songs
        </Link>
        <div className="flex-1" />
        <UserMenu userName={user.name} userImage={user.image} />
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative pb-20"
        style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.35) 0%, transparent 70%)",
        }} />

        {/* Profile */}
        <div className="relative max-w-2xl mx-auto px-6 pt-10 pb-2 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-4">
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} referrerPolicy="no-referrer" className="w-24 h-24 rounded-full ring-4 ring-white/20 shadow-2xl shadow-black/50" />
            ) : (
              <div className="w-24 h-24 rounded-full ring-4 ring-white/20 shadow-2xl shadow-black/50 bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {user.name?.[0] ?? "?"}
              </div>
            )}
            <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow ${
              isPaid ? "bg-indigo-500 text-white" : "bg-zinc-600 text-zinc-200"
            }`}>
              {planConfig.name}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2 mb-1">
            {user.name ?? "—"}
          </h1>
          <p className="text-white/50 text-sm mb-3">{user.email}</p>
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/50 text-xs px-3 py-1 rounded-full border border-white/10">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Member since {memberSince}
          </span>
        </div>
      </div>

      {/* ── Stat tiles — overlapping hero ───────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 gap-3">

          {/* Songs tile — indigo tint to match its partner */}
          <div
            className="rounded-2xl px-6 py-5 shadow-lg shadow-black/20 text-center ring-1 ring-white/15"
            style={{ background: "linear-gradient(135deg, #2d2a6e 0%, #3d3a9e 100%)" }}
          >
            <div className="text-4xl font-extrabold text-white tabular-nums leading-none">{songCount}</div>
            <div className="text-xs text-indigo-300 mt-2 font-medium">
              {songLimit === true ? "Songs created" : `Songs · ${songLimit} max`}
            </div>
          </div>

          {/* Plan tile */}
          <div
            className="rounded-2xl px-6 py-5 shadow-lg shadow-indigo-900/30 text-center"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            <div className="text-2xl font-extrabold text-white leading-none">
              {planConfig.name}
            </div>
            <div className="text-xs text-indigo-200 mt-2 font-medium">
              {isPaid ? `$${planConfig.price}/mo` : "Free plan"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pt-5 pb-16 space-y-4">

        {/* Plan card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Your plan</h2>
            <div className="flex items-center gap-2">
              {onTrial && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Trial — {daysLeft}d left
                </span>
              )}
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                isPaid ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-500"
              }`}>
                {planConfig.name}
              </span>
            </div>
          </div>

          {/* Trial notice */}
          {onTrial && (
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
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs shrink-0 bg-indigo-100 text-indigo-600 font-bold">✓</span>
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
              {renewsOn && (
                <div className="flex justify-between text-zinc-500">
                  <span>{onTrial ? "Trial ends" : "Next renewal"}</span>
                  <span className="font-semibold text-zinc-900">{renewsOn}</span>
                </div>
              )}
              {/* Upgrade to yearly upsell for monthly subscribers */}
              {plan === "monthly" && !onTrial && (
                <div className="pt-1 flex items-center justify-between gap-4 border-t border-zinc-200 mt-2">
                  <p className="text-xs text-zinc-500 leading-snug">
                    Save 27% and get priority support with the yearly plan.
                  </p>
                  <Link
                    href="/pricing"
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shadow shadow-indigo-200"
                  >
                    Upgrade to yearly →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div
              className="px-6 py-5 border-t border-zinc-100 flex items-center justify-between gap-4"
              style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)" }}
            >
              <p className="text-sm text-zinc-600 leading-snug">
                Unlock unlimited songs, PDF export, sharing and more.
              </p>
              <Link
                href="/pricing"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow shadow-indigo-300"
              >
                Upgrade →
              </Link>
            </div>
          )}
        </div>

        {/* Account card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
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
      </div>
    </div>
  );
}
