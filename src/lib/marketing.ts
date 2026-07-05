// Admin-triggered marketing emails ("upgrade nudges") via Resend.
// Legal basis: existing-customer soft opt-in — every mail carries a working
// one-click unsubscribe link (HMAC-signed, no login needed) and opted-out
// users are always skipped by the sender.

import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { adminRecipients } from "./notify";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "ChordSheetMaker <onboarding@resend.dev>";
const BASE_URL = "https://chordsheetmaker.ai";

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret";
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = unsubscribeToken(userId);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export type SendResult = "sent" | "skipped_optout" | "skipped_recent" | "failed";

/** Sends the upgrade-nudge email to one user. Skips opt-outs and anyone
 *  emailed within the last 7 days. */
export async function sendUpgradeNudge(userId: string): Promise<SendResult> {
  if (!RESEND_API_KEY) return "failed";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true,
      marketingOptOut: true, lastMarketingEmailAt: true,
      _count: { select: { songs: true } },
    },
  });
  if (!user?.email) return "failed";
  if (user.marketingOptOut) return "skipped_optout";
  if (user.lastMarketingEmailAt && Date.now() - user.lastMarketingEmailAt.getTime() < 7 * 24 * 3600_000) {
    return "skipped_recent";
  }

  const firstName = (user.name ?? "").split(" ")[0] || "there";
  const n = user._count.songs;
  const songLine = n > 0
    ? `You've built ${n} chord chart${n === 1 ? "" : "s"} on ChordSheetMaker — nice!`
    : `Your ChordSheetMaker account is ready whenever you are.`;
  const unsubUrl = `${BASE_URL}/unsubscribe?u=${user.id}&t=${unsubscribeToken(user.id)}`;
  const cta = `${BASE_URL}/pricing`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: user.email,
      bcc: adminRecipients(), // owner gets a copy of every nudge
      subject: n > 0 ? `Your ${n} song${n === 1 ? "" : "s"} deserve the full stage 🎸` : "Take ChordSheetMaker to the stage 🎸",
      text: `Hi ${firstName},\n\n${songLine}\n\nWith Pro you get unlimited songs, PDF export, public sharing and setlists — and it starts with a 7-day free trial (cancel anytime, no charge during the trial).\n\nStart your free trial: ${cta}\n\n— Claes, ChordSheetMaker\n\nUnsubscribe from these emails: ${unsubUrl}`,
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);padding:28px 32px;text-align:center;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;">Chord<span style="color:#818cf8;">SheetMaker</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Hi ${firstName} 👋</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">${songLine}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">With <strong>Pro</strong> you get unlimited songs, PDF export, public sharing and setlists for every gig — starting with a <strong>7-day free trial</strong>. Cancel anytime, no charge during the trial.</p>
          <a href="${cta}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">Start 7-day free trial →</a>
          <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">— Claes, ChordSheetMaker</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;border-top:1px solid #f4f4f5;padding-top:14px;">You get this because you have a ChordSheetMaker account. <a href="${unsubUrl}" style="color:#6366f1;">Unsubscribe</a> from these emails.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }),
  });
  if (!res.ok) return "failed";

  await prisma.user.update({ where: { id: user.id }, data: { lastMarketingEmailAt: new Date() } });
  await logActivity("marketing_email", user.id, { template: "upgrade_nudge" });
  return "sent";
}
