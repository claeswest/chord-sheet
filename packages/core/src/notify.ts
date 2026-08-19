// "Email me when something happens" — admin notifications via Resend.
//
// Infrastructure, not product logic: it knows how to send a message and
// nothing about what is worth sending. That's why it lives here rather than
// being copied into a second app, which is what was about to happen.
//
// Two rules it never breaks:
//  - It never throws. A notification is a side effect of something a user
//    did; a failed send must not fail their action. A subscription that goes
//    through but doesn't email you is a nuisance. One that fails BECAUSE the
//    email failed is a lost customer.
//  - It stays silent when unconfigured. No key or no recipients means no
//    send, not a crash — a deployment without Resend is a valid deployment.

export type Notifier = {
  /** The addresses that will be written to. Empty means notifications are off. */
  recipients(): string[];
  /** Sends, or quietly does nothing. Never rejects. */
  send(subject: string, lines: string[]): Promise<void>;
};

let warnedMissingKey = false;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function createNotifier(opts: {
  /** Shown in the footer, so a message says which product it came from. */
  product: string;
  /** Defaults to Resend's shared sender, which works before a domain is verified. */
  from?: string;
}): Notifier {
  const from = opts.from ?? `${opts.product} <onboarding@resend.dev>`;

  function recipients(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    recipients,
    async send(subject, lines) {
      const to = recipients();
      // Read at call time, not module load: on serverless the env is present
      // per invocation, and reading at import has bitten this codebase before.
      const key = process.env.RESEND_API_KEY;

      // Recipients but no key is half a configuration, not a decision — and
      // silence there is indistinguishable from "nothing happened". Said once
      // per instance so a busy webhook doesn't fill the log.
      if (!key && to.length > 0 && !warnedMissingKey) {
        warnedMissingKey = true;
        console.warn(
          `[notify] ADMIN_EMAILS is set but RESEND_API_KEY is not — ${opts.product} notifications are silently disabled.`,
        );
      }

      if (!key || to.length === 0) return;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to,
            subject,
            text: lines.join("\n"),
            html:
              `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#18181b;line-height:1.6">` +
              lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("") +
              `<p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;border-top:1px solid #eee;padding-top:8px">${escapeHtml(opts.product)} · admin notification</p>` +
              `</div>`,
          }),
        });
      } catch {
        // Swallowed on purpose. See the note at the top of this file.
      }
    },
  };
}
