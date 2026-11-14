"use client";

import { useState } from "react";

/**
 * Opens the Stripe customer portal. Everything about a subscription happens
 * there — cancelling, resuming, cards, invoices — so the label says which of
 * those the button is offered for, and `primary` is for when it is the one
 * thing on the page we hope gets pressed.
 */
export default function ManageSubscriptionButton({
  label = "Manage subscription",
  primary = false,
}: {
  label?: string;
  primary?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`shrink-0 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-wait ${
        primary
          ? "text-sm bg-ink text-paper hover:bg-stone-700 px-4 py-2"
          : "text-xs border border-ink/20 text-ink hover:border-ink/60 px-3 py-1.5"
      }`}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
