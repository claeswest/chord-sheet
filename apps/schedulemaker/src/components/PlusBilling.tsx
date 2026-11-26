"use client";

// The two buttons that lead to Stripe: "Skaffa Plus" and "Hantera abonnemang".
//
// Neither does anything here. Each asks the server for an address at Stripe
// and sends the browser there: the card is typed on Stripe's page, and ending
// a subscription is done on Stripe's page.

import { useState } from "react";

export default function PlusBilling({
  mode,
  label,
  quiet = false,
}: {
  /** `checkout` starts a purchase, `portal` opens what is already bought. */
  mode: "checkout" | "portal";
  label: string;
  /** Not the main thing on the page: drawn as an ordinary button. */
  quiet?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stripe/${mode}`, { method: "POST" });
      const data: { url?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Det gick inte fram. Försök igen om en stund.");
        setBusy(false);
        return;
      }
      // The button stays busy: the page is on its way to Stripe, and a button
      // that springs back to life meanwhile invites a second press.
      window.location.href = data.url;
    } catch {
      setError("Det gick inte fram. Försök igen om en stund.");
      setBusy(false);
    }
  }

  return (
    <>
      <p className="plus-ask">
        <button className={quiet ? undefined : "primary"} onClick={go} disabled={busy}>
          {busy ? "Öppnar…" : label}
        </button>
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
