"use client";

// The one button on the Plus page: "Jag vill ha Plus".
//
// It stands where a "Köp" button will stand. Until there is something to buy
// it records that this account wants it (see app/api/plus/interest), and says
// so plainly — nobody should think they have ordered anything.

import { useState } from "react";
import Link from "next/link";

export default function PlusInterest({
  signedIn,
  email,
  interested,
}: {
  signedIn: boolean;
  /** Where the answer will be sent, shown back so it is clear what was given. */
  email: string | null;
  /** This account has already said so. */
  interested: boolean;
}) {
  const [done, setDone] = useState(interested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="plus-ask">
        <Link href="/login?next=plus" className="btn primary">
          Logga in och säg till
        </Link>
        <span className="hint">Vi behöver en adress att höra av oss till.</span>
      </p>
    );
  }

  if (done) {
    return (
      <p className="plus-thanks" role="status">
        <strong>Tack, då vet vi!</strong> Vi hör av oss{email ? ` till ${email}` : ""} när Plus finns.
        Du har inte köpt något och förbinder dig inte till något.
      </p>
    );
  }

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plus/interest", { method: "POST" });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Det gick inte fram. Försök igen om en stund.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="plus-ask">
        <button className="primary" onClick={ask} disabled={busy}>
          {busy ? "Skickar…" : "Jag vill ha Plus"}
        </button>
        <span className="hint">Du köper ingenting. Vi hör bara av oss när det finns.</span>
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
