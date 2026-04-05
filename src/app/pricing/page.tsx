"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PLANS, Plan } from "@/lib/plans";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly", "lifetime"];

const FEATURE_LABELS: Record<string, string> = {
  songLimit: "Songs",
  chordTranspose: "Chord transposition",
  pdfExport: "PDF export",
  sharing: "Public song sharing",
  setlists: "Setlists / folders",
  prioritySupport: "Priority support",
};

function featureValue(val: boolean | number): string {
  if (val === true) return "✓";
  if (val === false) return "—";
  return String(val);
}

export default function PricingPage() {
  return <Suspense><PricingContent /></Suspense>;
}

function PricingContent() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";

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
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <Link href="/songs" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          ← My Songs
        </Link>
      </header>
      <div className="py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {success ? (
          <div className="max-w-md mx-auto mb-12 bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">You&apos;re all set!</h1>
            <p className="text-zinc-500 mb-6">
              Your subscription is active. It may take a few seconds to reflect on your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/account"
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                View my account
              </Link>
              <Link
                href="/songs"
                className="bg-zinc-100 text-zinc-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Go to my songs
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple pricing</h1>
            <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">{error}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLANS[planKey];
            const isPopular = planKey === "yearly";
            return (
              <div
                key={planKey}
                className={`relative bg-white rounded-2xl shadow-sm border p-6 flex flex-col ${
                  isPopular ? "border-indigo-500 ring-2 ring-indigo-500" : "border-gray-200"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    {planKey === "monthly" && <span className="text-gray-400 text-sm mb-1">/mo</span>}
                    {planKey === "yearly" && <span className="text-gray-400 text-sm mb-1">/yr</span>}
                    {planKey === "lifetime" && <span className="text-gray-400 text-sm mb-1"> once</span>}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const val = plan.features[key as keyof typeof plan.features];
                    const active = val !== false && val !== 0;
                    return (
                      <li key={key} className={`flex items-center gap-2 text-sm ${active ? "text-gray-700" : "text-gray-300"}`}>
                        <span className="w-4 text-center">{featureValue(val)}</span>
                        <span>{key === "songLimit" ? (val === true ? "Unlimited songs" : `Up to ${val} songs`) : label}</span>
                      </li>
                    );
                  })}
                </ul>

                {planKey === "free" ? (
                  <div className="text-center text-sm text-gray-400 py-2">Current plan</div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={loading === planKey}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isPopular
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    } disabled:opacity-50`}
                  >
                    {loading === planKey ? "Redirecting..." : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
