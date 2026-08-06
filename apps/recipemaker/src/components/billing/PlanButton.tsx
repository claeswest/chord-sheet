"use client";

import { useState } from "react";
import type { Plan } from "@/lib/plans";

// Starts checkout, or opens the Stripe billing portal for someone who already
// pays. Both return a URL to redirect to rather than doing anything locally —
// card details never touch this app.

export default function PlanButton({
  plan,
  mode,
  label,
}: {
  plan?: Plan;
  mode: "checkout" | "portal";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stripe/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: mode === "checkout" ? JSON.stringify({ plan }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server.");
      // Only reset on failure: on success the page is navigating away, and a
      // button that springs back to life mid-redirect invites a second click.
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={go}
        disabled={busy}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper-raised disabled:opacity-40"
      >
        {busy ? "One moment…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </>
  );
}
