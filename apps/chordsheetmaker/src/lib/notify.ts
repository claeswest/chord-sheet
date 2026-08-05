// Admin notifications via Resend — "email me when X happens" for the founder.
// Sends to every address in ADMIN_EMAILS, from EMAIL_FROM. Enabled only when
// RESEND_API_KEY is set. Never throws: a failed notification must not break the
// user action that triggered it.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "ChordSheetMaker <onboarding@resend.dev>";

export function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyAdmin(subject: string, lines: string[]): Promise<void> {
  const to = adminRecipients();
  if (!RESEND_API_KEY || to.length === 0) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        text: lines.join("\n"),
        html:
          `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#18181b;line-height:1.6">` +
          lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("") +
          `<p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;border-top:1px solid #eee;padding-top:8px">ChordSheetMaker · admin notification</p>` +
          `</div>`,
      }),
    });
  } catch {
    // swallow — notifications must never break the app
  }
}
