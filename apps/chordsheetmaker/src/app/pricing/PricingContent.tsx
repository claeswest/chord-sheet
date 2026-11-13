"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PLANS, Plan, yearlySavingPercent, yearlyPerMonth } from "@/lib/plans";
import UserMenu from "@/components/ui/UserMenu";
import { trackTrialStarted } from "@/lib/analytics";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { BTN_INK, BTN_LINE, Eyebrow } from "@/components/landing/kit";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly"];

const FEATURES: { key: string; label: string }[] = [
  { key: "songLimit",       label: "Songs"               },
  { key: "chordTranspose",  label: "Chord transposition" },
  { key: "pdfExport",       label: "PDF export"          },
  { key: "sharing",         label: "Public song sharing" },
  { key: "setlists",        label: "Setlists & collections" },
  { key: "prioritySupport", label: "Priority support"    },
];

export default function PricingContent({ currentPlan, userName, userImage }: { currentPlan: string | null; userName?: string | null; userImage?: string | null }) {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const autoTriggered = useRef(false);

  async function handleUpgrade(plan: Plan) {
    if (plan === "free") return;
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?next=/pricing?plan=${plan}`;
        return;
      }
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      if (data.url) { trackTrialStarted(plan); window.location.href = data.url; }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  // Auto-trigger checkout if returning from login with ?plan=
  useEffect(() => {
    if (autoTriggered.current) return;
    const plan = searchParams.get("plan") as Plan | null;
    if (plan && PLAN_ORDER.includes(plan) && plan !== "free" && (currentPlan === "free" || currentPlan === null)) {
      autoTriggered.current = true;
      handleUpgrade(plan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFreePlan = currentPlan === "free" || currentPlan === null;

  return (
    <div className={`${LANDING_FONTS} min-h-screen flex flex-col bg-paper text-ink`}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex items-center gap-4 sm:gap-6 px-5 sm:px-8 h-[61px] max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home" className="text-lg sm:text-xl font-extrabold tracking-tight text-ink whitespace-nowrap" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-chord">Maker</span>
          </Link>
          <div className="flex-1" />
          <Link href="/songs" className="text-sm text-stone-600 hover:text-ink transition-colors whitespace-nowrap py-2">
            {userName ? "← Songs" : "Try it free"}
          </Link>
          {userName
            ? <UserMenu userName={userName} userImage={userImage} tone="paper" />
            : <Link href="/login?next=/pricing" className="text-sm text-stone-600 hover:text-ink transition-colors whitespace-nowrap py-2">Sign in</Link>}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24">
        <Eyebrow className="mb-4">Pricing</Eyebrow>
        <h1 className="font-display font-medium text-[2.6rem] sm:text-6xl leading-[1.05] tracking-[-0.02em] text-ink mb-4">
          Plans &amp; pricing
        </h1>
        <p className="text-lg sm:text-xl text-stone-600 mb-2">
          Start free. Upgrade when you&apos;re ready.
        </p>
        <p className="text-sm text-stone-500 max-w-xl">
          Every plan includes AI song search, photo import, AI backgrounds &amp; fonts, and setlists &amp; collections.
        </p>

        {success && (
          <div role="status" className="mt-8 max-w-xl rounded-xl border-2 border-ink bg-white p-6">
            <h2 className="font-display text-2xl text-ink mb-1">You&apos;re all set.</h2>
            <p className="text-stone-600 text-[15px] mb-5">Your subscription is active. It may take a few seconds to reflect.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/songs" className={`${BTN_INK} px-5 py-2.5 text-sm`}>
                Go to my songs <span aria-hidden>→</span>
              </Link>
              <Link href="/account" className={`${BTN_LINE} px-5 py-2.5 text-sm`}>
                View my account
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-8 max-w-xl text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
        )}

        {/* Cards */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-md md:max-w-none">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLANS[planKey];
            const isPopular = planKey === "yearly";
            const isCurrent = planKey === currentPlan;
            const isFree = planKey === "free";
            // One label per card at most: where you are beats what is popular.
            const label = isCurrent ? "Your current plan" : isPopular ? "Most popular" : null;

            return (
              <div
                key={planKey}
                className={`relative flex flex-col rounded-xl bg-white ${
                  // On mobile lead with the recommended plan: Yearly ("Most
                  // popular") first, Free drops to the bottom. Desktop unchanged.
                  isFree ? "order-last md:order-none " : isPopular ? "order-first md:order-none " : ""
                }${
                  isCurrent
                    ? "border-2 border-emerald-600"
                    : isPopular
                    ? "border-2 border-ink"
                    : "border border-rule"
                }`}
              >
                {label && (
                  <span className={`absolute -top-3 left-6 font-mono text-[10px] font-medium uppercase tracking-[0.14em] px-2.5 py-1 rounded text-white ${isCurrent ? "bg-emerald-700" : "bg-ink"}`}>
                    {label}
                  </span>
                )}

                <div className="px-6 pt-8 pb-6">
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500 mb-4">{plan.name}</h2>

                  <div className="flex items-baseline gap-2">
                    {isFree ? (
                      <span className="font-display text-5xl leading-none text-ink">Free</span>
                    ) : (
                      <>
                        <span className="font-display text-5xl leading-none text-ink">${plan.price}</span>
                        <span className="text-stone-500 text-sm">{planKey === "monthly" ? "/mo" : "/yr"}</span>
                        {planKey === "yearly" && (
                          <span className="ml-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">Save {yearlySavingPercent()}%</span>
                        )}
                      </>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-stone-500 min-h-5">
                    {planKey === "yearly" ? `≈ $${yearlyPerMonth()}/month, billed yearly` : plan.description}
                  </p>
                </div>

                {/* Features — all plans show all 6 rows for visual consistency */}
                <div className="px-6 py-6 border-t border-rule flex-1">
                  <ul className="space-y-3">
                    {FEATURES.map(({ key, label: featureLabel }) => {
                      const val = plan.features[key as keyof typeof plan.features];
                      const active = val !== false && val !== 0;
                      return (
                        <li key={key} className={`flex items-baseline gap-3 text-[15px] ${active ? "text-ink" : "text-stone-400"}`}>
                          <span aria-hidden className={`w-3 shrink-0 text-center font-semibold ${active ? "text-chord" : "text-stone-300"}`}>
                            {active ? "✓" : "–"}
                          </span>
                          {!active && <span className="sr-only">Not included: </span>}
                          {key === "songLimit"
                            ? val === true ? "Unlimited songs" : `Up to ${val} songs`
                            : featureLabel}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="px-6 pb-6 space-y-2.5">
                  {isCurrent ? (
                    <Link href="/account" className={`${BTN_LINE} w-full py-3 text-sm`}>
                      Manage plan
                    </Link>
                  ) : isFree ? (
                    <Link href="/songs" className={`${BTN_LINE} w-full py-3 text-sm`}>
                      Get started free
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planKey)}
                      disabled={loading === planKey}
                      className={`${isPopular ? BTN_INK : BTN_LINE} w-full py-3 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-wait`}
                    >
                      {loading === planKey
                        ? "Redirecting…"
                        : !onFreePlan
                        ? `Upgrade to ${planKey} →`
                        : "Start 7-day free trial →"}
                    </button>
                  )}
                  {/* Always rendered on desktop so the three buttons sit on one line. */}
                  <p className={`text-center text-xs text-stone-500 ${!isCurrent && !isFree && onFreePlan ? "" : "hidden md:block md:invisible"}`}>
                    {!isCurrent && !isFree && onFreePlan
                      ? <>7 days free · then ${plan.price}{planKey === "monthly" ? "/mo" : "/yr"} · cancel anytime</>
                      : "\u00a0"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <p className="mt-8 sm:mt-10 text-sm text-stone-500">
          Secure payments via Stripe · Cancel anytime · No hidden fees
        </p>
      </main>
    </div>
  );
}
