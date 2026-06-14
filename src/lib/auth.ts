import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import AppleProvider from "next-auth/providers/apple";
import ResendProvider from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { prisma } from "./prisma";

// Whether "Sign in with Apple" is configured. Read in one place so the auth
// config and the login page agree on whether to offer it.
export const appleEnabled = Boolean(
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
);

// Whether passwordless "magic link" email sign-in is configured. Only enabled
// once a Resend API key is present, so the app is safe to deploy without it.
export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

// Address magic-link emails are sent from. Until the chordsheetmaker.ai domain
// is verified in Resend, the shared onboarding@resend.dev sender only delivers
// to the Resend account owner's own inbox — fine for testing. Set EMAIL_FROM to
// e.g. "ChordSheetMaker <noreply@chordsheetmaker.ai>" once the domain is verified.
const emailFrom = process.env.EMAIL_FROM ?? "ChordSheetMaker <onboarding@resend.dev>";

// Branded sign-in email (overrides Auth.js's plain default).
async function sendMagicLink(params: {
  identifier: string;
  url: string;
  provider: { apiKey?: string; from?: string };
}) {
  const { identifier: to, url, provider } = params;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: "Your ChordSheetMaker sign-in link",
      text: `Sign in to ChordSheetMaker:\n${url}\n\nThis link expires in 24 hours. If you didn't request it, you can ignore this email.`,
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);padding:28px 32px;text-align:center;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Chord<span style="color:#818cf8;">SheetMaker</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Sign in to ChordSheetMaker</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">Click the button below to sign in. This link works once and expires in 24 hours.</p>
          <a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">Sign in →</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">If the button doesn't work, copy and paste this link:<br><a href="${url}" style="color:#6366f1;word-break:break-all;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;border-top:1px solid #f4f4f5;padding-top:16px;">If you didn't request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }),
  });
  if (!res.ok) {
    throw new Error("Resend error: " + JSON.stringify(await res.json()));
  }
}

// Lazy initialization so env vars are read fresh on every request,
// avoiding module-init timing issues in Vercel serverless.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const providers: Provider[] = [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ];

  // Apple — only enabled once its credentials are set, so the app is safe to
  // deploy before the Apple Developer setup is done. APPLE_CLIENT_SECRET is the
  // signed JWT produced by scripts/generate-apple-secret.mjs (renew ≤6 months).
  if (appleEnabled) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      })
    );
  }

  // Passwordless magic-link email — works for anyone with an email address, no
  // third-party account needed. Enabled only when RESEND_API_KEY is set.
  if (emailEnabled) {
    providers.push(
      ResendProvider({
        apiKey: process.env.RESEND_API_KEY!,
        from: emailFrom,
        sendVerificationRequest: sendMagicLink,
      })
    );
  }

  return {
    adapter: PrismaAdapter(prisma as any),
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers,
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
    },
    pages: {
      signIn: "/login",
      signOut: "/signout",
      verifyRequest: "/verify-request",
    },
  };
});
