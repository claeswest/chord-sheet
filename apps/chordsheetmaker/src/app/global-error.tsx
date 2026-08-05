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
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #1a1640 100%)",
          color: "white",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>𝄞</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
            Something hit a wrong note
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: "0 0 24px" }}>
            An unexpected error occurred. It&rsquo;s been logged and we&rsquo;ll take a look.
            Try again — your work is saved.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "white",
              border: "none",
              padding: "12px 28px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <div style={{ marginTop: 16 }}>
            <a href="/songs" style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textDecoration: "none" }}>
              Back to my songs
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
