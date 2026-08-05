// Central error reporter.
//
// Every captured error (server or client) flows through here. By default it
// writes a structured line to the server console, which Vercel captures in its
// Logs/Observability view — so you get visibility with zero external setup.
//
// To also push errors to Slack / Discord / a Sentry tunnel / any HTTP sink,
// set ERROR_WEBHOOK_URL in your environment and they'll be POSTed there too.

export interface ErrorReport {
  /** Where the error came from, e.g. "server:onRequestError" or "client". */
  source: string;
  message: string;
  stack?: string;
  /** Request path / page URL the error occurred on. */
  path?: string;
  /** Extra structured context (route type, digest, user agent, etc.). */
  context?: Record<string, unknown>;
}

export async function reportError(report: ErrorReport): Promise<void> {
  const payload = { ...report, at: new Date().toISOString() };

  // 1. Always log — Vercel captures stdout/stderr automatically.
  console.error("[error-report]", JSON.stringify(payload));

  // 2. Optionally forward to an external sink.
  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Never let error reporting throw.
    }
  }
}
