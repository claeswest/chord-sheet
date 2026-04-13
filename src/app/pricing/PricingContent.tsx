"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PLANS, Plan } from "@/lib/plans";
import UserMenu from "@/components/ui/UserMenu";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly"];

const FEATURES: { key: string; label: string }[] = [
  { key: "songLimit",       label: "Songs"               },
  { key: "chordTranspose",  label: "Chord transposition" },
  { key: "pdfExport",       label: "PDF export"          },
  { key: "sharing",         label: "Public song sharing" },
  { key: "setlists",        label: "Setlists & folders"  },
  { key: "prioritySupport", label: "Priority support"    },
];

export default function PricingContent({ currentPlan, userName, userImage }: { currentPlan: string; userName?: string | null; userImage?: string | null }) {
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
      if (data.url) window.location.href = data.url;
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
    if (plan && PLAN_ORDER.includes(plan) && plan !== "free" && currentPlan === "free") {
      autoTriggered.current = true;
      handleUpgrade(plan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f0f5" }}>

      {/* Header */}
      <header className="bg-[#302b63] border-b border-white/10 px-6 h-14 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-sm font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-nunito)" }}>
          ChordSheet<span className="text-indigo-400">Maker</span>
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <Link href="/songs" className="text-sm text-white/60 hover:text-white transition-colors">
          ← Songs
        </Link>
        <div className="flex-1" />
        {userName && <UserMenu userName={userName} userImage={userImage} />}
      </header>

      {/* Hero */}
      <div
        className="relative py-12 text-center px-6"
        style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)",
        }} />
        <span className="relative inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border border-indigo-500/30">
          Pricing
        </span>
        <h1 className="relative text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
          Plans & pricing
        </h1>
        <p className="relative text-zinc-400 text-lg max-w-md mx-auto">
          Start free. Upgrade when you're ready.
        </p>

        {success && (
          <div className="relative max-w-md mx-auto mt-8 bg-white/10 border border-white/20 rounded-2xl p-6 text-center backdrop-blur-sm">
            <div className="text-3xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-white mb-1">You&apos;re all set!</h2>
            <p className="text-white/60 text-sm mb-5">Your subscription is active. It may take a few seconds to reflect.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/account" className="bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-400 transition-colors">
                View my account
              </Link>
              <Link href="/songs" className="bg-white/10 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors border border-white/20">
                Go to my songs
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 -mt-8 pb-10">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl mb-6 text-center">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLANS[planKey];
            const isPopular = planKey === "yearly";
            const isCurrent = planKey === currentPlan;
            const isFree = planKey === "free";

            return (
              <div
                key={planKey}
                className={`relative bg-white rounded-2xl flex flex-col overflow-hidden shadow-sm min-h-[480px] ${
                  isPopular
                    ? "ring-2 ring-indigo-500 shadow-indigo-100 shadow-md"
                    : isCurrent
                    ? "ring-2 ring-emerald-400"
                    : "border border-zinc-200"
                }`}
              >
                {/* Top banner — always rendered to keep content aligned across all cards */}
                {isCurrent ? (
                  <div className="bg-emerald-500 text-white text-xs font-bold tracking-wide text-center py-1.5 uppercase">
                    Your current plan
                  </div>
                ) : isPopular ? (
                  <div className="bg-indigo-500 text-white text-xs font-bold tracking-wide text-center py-1.5 uppercase">
                    Most popular
                  </div>
                ) : (
                  <div className="text-xs font-bold tracking-wide text-center py-1.5 uppercase invisible" aria-hidden>&nbsp;</div>
                )}

                <div className="px-6 pt-6 pb-4">
                  {/* Plan name — fixed height */}
                  <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{plan.name}</h2>

                  {/* Price — fixed height so all cards align */}
                  <div className="h-11 flex items-end">
                    {isFree ? (
                      <span className="text-4xl font-extrabold text-zinc-900">Free</span>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-zinc-900">${plan.price}</span>
                        <span className="text-zinc-400 text-sm mb-1">{planKey === "monthly" ? "/mo" : "/yr"}</span>
                      </div>
                    )}
                  </div>

                  {/* Description + badge — fixed height */}
                  <div className="h-7 flex items-center gap-2 mt-1">
                    <p className="text-xs text-zinc-400">{plan.description}</p>
                    {planKey === "yearly" && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Save 27%</span>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-100 flex-1">
                  <ul className="space-y-2.5">
                    {FEATURES.filter(({ key }) => {
                      // Hide locked features on paid plans — only show as upsell on free
                      const val = plan.features[key as keyof typeof plan.features];
                      const active = val !== false && val !== 0;
                      return isFree ? true : active;
                    }).map(({ key, label }) => {
                      const val = plan.features[key as keyof typeof plan.features];
                      const active = val !== false && val !== 0;
                      return (
                        <li key={key} className={`flex items-center gap-2.5 text-sm ${active ? "text-zinc-700" : "text-zinc-300"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                            active ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-300"
                          }`}>
                            {active ? "✓" : "—"}
                          </span>
                          {key === "songLimit"
                            ? val === true ? "Unlimited songs" : `Up to ${val} songs`
                            : label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-zinc-100 space-y-2">
                  {isCurrent ? (
                    <Link
                      href="/account"
                      className="block w-full text-center py-2.5 rounded-full text-sm font-medium border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      Manage plan
                    </Link>
                  ) : isFree ? (
                    <Link
                      href="/songs"
                      className="block w-full text-center py-2.5 rounded-full text-sm font-medium border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
                    >
                      Get started free
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpgrade(planKey)}
                        disabled={loading === planKey}
                        className={`w-full py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
                          isPopular
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                            : "bg-zinc-900 text-white hover:bg-zinc-700"
                        }`}
                      >
                        {loading === planKey
                          ? "Redirecting…"
                          : currentPlan !== "free"
                          ? `Upgrade to ${planKey} →`
                          : "Start 7-day free trial →"}
                      </button>
                      {currentPlan === "free" && (
                        <p className="text-center text-[11px] text-zinc-400">
                          7 days free · then {planKey === "monthly" ? "$9/mo" : "$79/yr"} · cancel anytime
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          Secure payments via Stripe · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
