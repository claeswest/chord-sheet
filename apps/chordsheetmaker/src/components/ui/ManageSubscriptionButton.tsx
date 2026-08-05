"use client";

import { useState } from "react";

export default function ManageSubscriptionButton() {
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
      className="shrink-0 text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50"
    >
      {loading ? "Redirecting…" : "Manage subscription"}
    </button>
  );
}
