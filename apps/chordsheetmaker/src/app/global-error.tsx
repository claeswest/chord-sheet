"use client";

import { useEffect } from "react";

// Root error boundary. Catches errors thrown anywhere in the app (including the
// root layout), reports them to the server, and shows a friendly fallback.
// global-error.tsx must render its own <html>/<body> as it replaces the layout.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        message: error?.message ?? "Unknown error",
        stack: error?.stack,
        digest: error?.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      // keepalive lets the report survive a page navigation/unload.
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never let reporting throw */
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          // Inline, and the paper-and-ink values by hand: this replaces the root
          // layout, so no stylesheet and no font is guaranteed to have loaded.
          background: "#faf6ee",
          color: "#1c1917",
          padding: "24px",
          textAlign: "left",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 12px" }}>
            Something hit a wrong note
          </h1>
          <p style={{ color: "#57534e", lineHeight: 1.6, margin: "0 0 28px" }}>
            An unexpected error occurred. It&rsquo;s been logged and we&rsquo;ll take a look.
            Try again — your work is saved.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#1c1917",
              color: "#faf6ee",
              border: "none",
              padding: "13px 28px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <div style={{ marginTop: 16 }}>
            <a href="/songs" style={{ color: "#57534e", fontSize: 14, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Back to my songs
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
