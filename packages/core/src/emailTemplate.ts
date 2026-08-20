// The shell every customer email is poured into: masthead, greeting, a list of
// ticked points, one call to action, and the unsubscribe footer.
//
// It knows layout and nothing else. What to say, and who deserves to hear it,
// belongs to the product — this file only decides how it looks in Outlook.
//
// Table-based markup with inline styles on purpose. Mail clients strip <style>
// blocks, ignore flexbox and, in Outlook's case, render through Word. Every
// rule that looks dated here is load-bearing.
//
// A plain-text alternative is built from the same content rather than written
// separately, so the two can't drift.

export type EmailBrand = {
  /** Product name, used in the footer and as the default masthead. */
  product: string;
  /** Buttons and tick marks. */
  accent: string;
  /** CSS background for the masthead — a colour or a gradient. */
  headerBackground: string;
  /** Masthead markup, if the wordmark is more than the product name. */
  headerHtml?: string;
  /** Signature line, e.g. "— Claes, RecipeBookMaker". */
  signOff: string;
  /** Page background behind the card. */
  pageBackground?: string;
};

export type EmailContent = {
  subject: string;
  /** The grey line after the subject in an inbox list. Worth writing. */
  preheader: string;
  /** Greeted as "Hi <name>". */
  name: string;
  intro: string;
  /** Ticked rows: [bold lead, explanation]. */
  items: [string, string][];
  ctaLabel: string;
  ctaUrl: string;
  /** Small print under the button — price, caveat, invitation to reply. */
  footnote?: string;
  /** Omitted for transactional mail, which has nothing to unsubscribe from. */
  unsubscribeUrl?: string;
};

/**
 * Escapes text destined for HTML.
 *
 * Not paranoia: `name` comes from a user's own profile, and every one of these
 * emails is BCC'd to the owner — so one account's display name would otherwise
 * render as markup in someone else's inbox.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A URL safe to put in href — anything but http(s) and mailto is dropped. */
function safeUrl(url: string): string {
  return /^(https?:|mailto:)/i.test(url) ? esc(url) : "#";
}

export function renderEmail(
  brand: EmailBrand,
  c: EmailContent,
): { subject: string; html: string; text: string } {
  const page = brand.pageBackground ?? "#f4efe6";
  const masthead = brand.headerHtml ?? `<span style="font-size:20px;font-weight:800;color:#ffffff;">${esc(brand.product)}</span>`;
  const cta = safeUrl(c.ctaUrl);

  const text = [
    `Hi ${c.name},`,
    "",
    c.intro,
    "",
    ...c.items.map(([t, d]) => `- ${t} — ${d}`),
    "",
    ...(c.footnote ? [c.footnote, ""] : []),
    `${c.ctaLabel.replace(" →", "")}: ${c.ctaUrl}`,
    "",
    brand.signOff,
    ...(c.unsubscribeUrl ? ["", `Unsubscribe from these emails: ${c.unsubscribeUrl}`] : []),
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:${brand.headerBackground};padding:28px 32px;text-align:center;">
          ${masthead}
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Hi ${esc(c.name)} 👋</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">${esc(c.intro)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            ${c.items
              .map(
                ([t, d]) =>
                  `<tr><td style="padding:0 8px 10px 0;font-size:14px;line-height:1.5;color:${brand.accent};vertical-align:top;">&#10003;</td><td style="padding:0 0 10px;font-size:14px;line-height:1.5;color:#52525b;"><strong style="color:#18181b;">${esc(t)}</strong> — ${esc(d)}</td></tr>`,
              )
              .join("")}
          </table>
          <a href="${cta}" style="display:inline-block;background:${brand.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">${esc(c.ctaLabel)}</a>
          ${c.footnote ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">${esc(c.footnote)}</p>` : ""}
          <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">${esc(brand.signOff)}</p>
        </td></tr>
        ${
          c.unsubscribeUrl
            ? `<tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;border-top:1px solid #f4f4f5;padding-top:14px;">You get this because you have a ${esc(brand.product)} account. <a href="${safeUrl(c.unsubscribeUrl)}" style="color:${brand.accent};">Unsubscribe</a> from these emails.</p>
        </td></tr>`
            : ""
        }
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: c.subject, html, text };
}
