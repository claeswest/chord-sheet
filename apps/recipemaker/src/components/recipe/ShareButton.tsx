"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Publish a recipe as a link, and take it back down.
//
// The link is shown as selectable text next to a copy button rather than only
// being copied to the clipboard: clipboard writes fail silently in some
// browsers and permission states, and "Copied!" that didn't copy is worse than
// no button at all.

export default function ShareButton({
  recipeId,
  existingToken,
  canShare,
}: {
  recipeId: string;
  existingToken: string | null;
  /** Sharing is a paid feature — but revoking never is. */
  canShare: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState(existingToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}` : "";

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "upgrade_required"
            ? "Sharing is part of the paid plan."
            : (data.error ?? "Couldn't create the link."),
        );
        return;
      }
      setToken(data.token);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't withdraw the link.");
        return;
      }
      setToken(null);
      setCopied(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is on screen and selectable anyway.
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  }

  if (!token) {
    return (
      <span className="no-print inline-flex items-center gap-2">
        <button
          onClick={share}
          disabled={busy || !canShare}
          title={canShare ? undefined : "Sharing is part of the paid plan"}
          className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold hover:bg-paper-sunken disabled:opacity-40"
        >
          {busy ? "Creating…" : "Share a link"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </span>
    );
  }

  return (
    <span className="no-print inline-flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-64 rounded-lg border border-rule px-3 py-1.5 text-xs"
        aria-label="Public link to this recipe"
      />
      <button onClick={copy} className="rounded-full border border-rule px-3 py-1.5 text-sm">
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        onClick={revoke}
        disabled={busy}
        className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-danger-soft hover:text-danger disabled:opacity-40"
      >
        {busy ? "…" : "Stop sharing"}
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </span>
  );
}
