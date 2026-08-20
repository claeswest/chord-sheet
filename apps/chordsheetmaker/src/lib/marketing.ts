// Admin-triggered marketing emails ("upgrade nudges") via Resend.
// Legal basis: existing-customer soft opt-in — every mail carries a working
// one-click unsubscribe link (HMAC-signed, no login needed) and opted-out
// users are always skipped by the sender.

import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { adminRecipients } from "./notify";
import { PLANS } from "./plans";
import { templateBlockReason, type Audience } from "./marketingRules";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "ChordSheetMaker <onboarding@resend.dev>";
const BASE_URL = "https://chordsheetmaker.ai";

// Both live in @clavos/core now, unchanged — same secret, same digest, so
// every link already sitting in an inbox keeps working. Re-exported because
// the routes and pages here import them from this module.
export { unsubscribeToken, verifyUnsubscribeToken } from "@clavos/core/unsubscribe";
import { unsubscribeToken } from "@clavos/core/unsubscribe";

export type SendResult =
  | "sent" | "skipped_optout" | "skipped_recent" | "skipped_ineligible" | "failed";

// Template list, cooldown and sequence live in marketingRules so the admin UI
// can import them without pulling in prisma. Re-exported here so existing
// callers keep working.
export {
  MARKETING_TEMPLATES,
  EMAIL_COOLDOWN_DAYS,
  EMAIL_SEQUENCE,
  type MarketingTemplate,
} from "./marketingRules";
import { EMAIL_COOLDOWN_DAYS, type MarketingTemplate } from "./marketingRules";

type EmailContent = {
  subject: string;
  preheader: string;
  intro: string;              // paragraph under "Hi X 👋"
  items: [string, string][];  // checkmark rows: [title, description]
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;          // small print under the CTA (price etc.)
};

function buildContent(
  template: MarketingTemplate,
  firstName: string,
  n: number,
  /** Trial already spent — don't offer one again. */
  trialSpent = false,
): EmailContent {
  const freeLimit = typeof PLANS.free.features.songLimit === "number" ? PLANS.free.features.songLimit : 5;
  const monthly = PLANS.monthly.price;
  const yearly = PLANS.yearly.price;
  // Offering "7 days free" to someone who has already used their trial is
  // simply untrue, and it's untrue in a purchase pitch — the worst place for it.
  const priceLine = trialSpent
    ? `$${monthly}/month or $${yearly}/year. Cancel anytime.`
    : `7-day free trial, then $${monthly}/month or $${yearly}/year. Cancel anytime — no charge during the trial.`;

  if (template === "welcome_tips") {
    return {
      subject: `Welcome, ${firstName} — 3 tricks worth knowing 🎸`,
      preheader: "Photograph old sheets, style with AI, play hands-free.",
      intro: "Great to have you on ChordSheetMaker! Here are three things musicians love that are easy to miss:",
      items: [
        ["Snap a photo", "photograph a handwritten or printed sheet — AI turns it into an editable chart"],
        ["Make it beautiful", "open the Style panel and try an AI background and fonts — your chart, your look"],
        ["Play hands-free", "press play and the chart scrolls at your pace. Singers can even hide the chords"],
      ],
      ctaLabel: "Open your songs →",
      ctaUrl: `${BASE_URL}/songs`,
      footnote: "Stuck on anything? Just reply to this email — I read every message.",
    };
  }

  if (template === "winback") {
    return {
      subject: n > 0
        ? `Your ${n} chord chart${n === 1 ? "" : "s"} miss${n === 1 ? "es" : ""} you 🎶`
        : `Come see what's new on ChordSheetMaker 🎶`,
      preheader: "Lyrics-only mode for singers, smarter imports, more beautiful charts.",
      intro: n > 0
        ? `It's been a while! Your chord charts are right where you left them — and ChordSheetMaker has picked up some new tricks since your last visit:`
        : `It's been a while! ChordSheetMaker has picked up some new tricks since your last visit:`,
      items: [
        ["Lyrics-only mode", "singers can hide the chords with one tap and get a clean lyric sheet"],
        ["More beautiful charts", "sharper chord typography and smarter AI styling"],
        ["Share links", "send a chart to a bandmate — they play along with auto-scroll, no account needed"],
      ],
      ctaLabel: "Pick up where you left off →",
      ctaUrl: `${BASE_URL}/songs`,
      footnote: "Anything missing that would make it more useful for you? Reply and tell me — I read every message.",
    };
  }

  if (template === "ai_magic") {
    return {
      subject: `Your song picks its own look 🎨`,
      preheader: "The AI reads your lyrics — colors, fonts and background follow the song.",
      intro: "Here's a little secret about the Style panel: the AI doesn't pick colors at random. It reads what your song is about and designs for it:",
      items: [
        ["Colors from the lyrics", "a moody ballad gets dusk tones, a summer tune gets warmth — the palette follows the story"],
        ["Fonts with feeling", "typefaces are matched to the mood, from clean and modern to warm and handwritten"],
        ["A background that fits", "the AI background illustrates your song — neon city, ocean mist, an autumn road…"],
      ],
      ctaLabel: "Style one of your songs →",
      ctaUrl: `${BASE_URL}/songs`,
      footnote: "Open a song → Style → generate. Try it on your most-played song first — and reply if you want tips, I read every message.",
    };
  }

  if (template === "band_share") {
    return {
      subject: `Your whole band can play from your charts 🎤`,
      preheader: "One link — bandmates play with auto-scroll; singers see just the lyrics.",
      intro: "Play with other people? Every chart you make can be shared with a single link:",
      items: [
        ["One link, ready to play", "bandmates open it in any browser and play along with auto-scroll — no account needed"],
        ["Singers get their own view", "one tap hides the chords and leaves a clean lyric sheet"],
        ["Everyone in the same key", "transpose before you share, and the whole band reads the same chart"],
      ],
      ctaLabel: "Share a chart →",
      ctaUrl: `${BASE_URL}/songs`,
      footnote: trialSpent
        ? `Share links are part of Pro — $${monthly}/month. Cancel anytime.`
        : `Share links are part of Pro — 7-day free trial, then $${monthly}/month. Cancel anytime.`,
    };
  }

  if (template === "photo_rescue") {
    return {
      subject: `That binder of old chord sheets? 📷`,
      preheader: "Photograph a page — AI turns it into a clean, editable chart.",
      intro: "Got a binder or notebook full of handwritten chord sheets? You don't have to type them in:",
      items: [
        ["Snap a photo", "photograph the page — printed or handwritten, even messy"],
        ["AI does the typing", "lyrics and chords come out as a clean, editable chart"],
        ["Fix the details", "drag any chord to the right syllable, transpose, restyle — done"],
      ],
      ctaLabel: "Rescue a song →",
      ctaUrl: `${BASE_URL}/songs`,
      footnote: "Works best with one song per photo. Reply with a photo if you'd like me to test one for you!",
    };
  }

  if (template === "feedback_ask") {
    return {
      subject: `Quick question from the maker of ChordSheetMaker 💬`,
      preheader: "One-man band here — your reply goes straight to me.",
      intro: "I'm Claes, and I build ChordSheetMaker single-handedly. You've tried it — and honest feedback from real musicians is the most valuable thing I can get. Three things I'd love to know:",
      items: [
        ["What were you trying to make?", "a song for practice, a setlist for a gig, something else?"],
        ["Where did it fall short?", "anything confusing, missing or annoying"],
        ["What would make it a keeper?", "the one thing that would bring you back"],
      ],
      ctaLabel: "Just hit reply 💬",
      ctaUrl: `mailto:claes@clavos.se`,
      footnote: "No survey, no forms — replies land straight in my inbox, and I answer every one.",
    };
  }

  // upgrade_nudge — the at-limit variant is the strongest; below the limit,
  // celebrate what they've built; zero songs gets a gentle "ready when you are".
  const atLimit = n >= freeLimit;
  return {
    subject: atLimit
      ? `Your free song slots are full — keep the music coming 🎸`
      : n > 0
      ? `Your ${n} chord chart${n === 1 ? " is" : "s are"} just the start 🎸`
      : `Make your first stunning chord chart ✨`,
    preheader: "Unlimited songs, PDF export, share links & setlists — try Pro free for 7 days.",
    intro: atLimit
      ? `You've built ${n} chord charts and filled all ${freeLimit} free slots — your next song needs a bigger home. Pro gives you:`
      : n > 0
      ? `You've built ${n} chord chart${n === 1 ? "" : "s"} on ChordSheetMaker — nice! Here's what Pro adds:`
      : `Your ChordSheetMaker account is ready whenever you are — and Pro turns it into the full toolkit:`,
    items: [
      ["Unlimited songs", "build your whole repertoire, not just " + freeLimit],
      ["PDF export", "print-ready charts with every chord perfectly aligned"],
      ["Share links", "bandmates open and play with auto-scroll — no account needed"],
    ],
    ctaLabel: trialSpent ? "See Pro plans →" : "Start 7-day free trial →",
    ctaUrl: `${BASE_URL}/pricing`,
    footnote: priceLine,
  };
}

/** Sends one marketing email to one user. Skips opt-outs and anyone
 *  emailed within the last 7 days (shared across templates). */
export async function sendMarketingEmail(userId: string, template: MarketingTemplate): Promise<SendResult> {
  if (!RESEND_API_KEY) return "failed";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true,
      marketingOptOut: true, lastMarketingEmailAt: true,
      plan: true, stripeCancelAt: true, stripeCustomerId: true,
      _count: { select: { songs: true } },
    },
  });
  if (!user?.email) return "failed";
  if (user.marketingOptOut) return "skipped_optout";
  if (user.lastMarketingEmailAt && Date.now() - user.lastMarketingEmailAt.getTime() < EMAIL_COOLDOWN_DAYS * 24 * 3600_000) {
    return "skipped_recent";
  }

  // Reaching Stripe checkout at all means the one 7-day trial is gone.
  const audience: Audience = {
    plan: user.plan,
    cancelAt: user.stripeCancelAt,
    hasSubscribedBefore: !!user.stripeCustomerId,
  };
  // Enforced here rather than only in the admin UI, so an automated drip
  // inherits the rules instead of quietly bypassing them.
  if (templateBlockReason(template, audience)) return "skipped_ineligible";

  const firstName = (user.name ?? "").split(" ")[0] || "there";
  const { subject, preheader, intro, items, ctaLabel, ctaUrl, footnote } =
    buildContent(template, firstName, user._count.songs, audience.hasSubscribedBefore);

  const unsubUrl = `${BASE_URL}/unsubscribe?u=${user.id}&t=${unsubscribeToken(user.id)}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: user.email,
      bcc: adminRecipients(), // owner gets a copy of every nudge
      reply_to: adminRecipients()[0], // replies land with the founder
      // Gmail/Yahoo bulk-sender requirement: one-click list unsubscribe.
      // Points at the POST endpoint (RFC 8058); the footer link keeps the page.
      headers: {
        "List-Unsubscribe": `<${BASE_URL}/api/unsubscribe?u=${user.id}&t=${unsubscribeToken(user.id)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      subject,
      text: `Hi ${firstName},\n\n${intro}\n\n${items.map(([t, d]) => `- ${t} — ${d}`).join("\n")}\n\n${footnote ? footnote + "\n\n" : ""}${ctaLabel.replace(" →", "")}: ${ctaUrl}\n\n— Claes, ChordSheetMaker\n\nUnsubscribe from these emails: ${unsubUrl}`,
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);padding:28px 32px;text-align:center;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;">Chord<span style="color:#818cf8;">SheetMaker</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Hi ${firstName} 👋</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            ${items.map(([t, d]) => `<tr><td style="padding:0 8px 10px 0;font-size:14px;line-height:1.5;color:#4f46e5;vertical-align:top;">&#10003;</td><td style="padding:0 0 10px;font-size:14px;line-height:1.5;color:#52525b;"><strong style="color:#18181b;">${t}</strong> — ${d}</td></tr>`).join("")}
          </table>
          <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">${ctaLabel}</a>
          ${footnote ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">${footnote}</p>` : ""}
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
  await logActivity("marketing_email", user.id, { template });
  return "sent";
}
