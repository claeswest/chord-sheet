// NextAuth wiring for RecipeBookMaker.
//
// Deliberately a copy of ChordSheetMaker's rather than a shared package. The
// plan (packages/core/README.md) is to extract once two apps have shown what
// genuinely repeats — the brand copy, the email HTML and the admin
// notifications are all product-specific, and guessing that seam from one
// implementation is how you get a bad abstraction.
//
// Providers are added only when their credentials exist, so the app builds and
// deploys before any OAuth setup is done.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { prisma } from "./prisma";
import { logActivity } from "./activity";

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/** Passwordless magic-link sign-in, enabled once a Resend key is present. */
export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

const emailFrom = process.env.EMAIL_FROM ?? "RecipeBookMaker <onboarding@resend.dev>";

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
      subject: "Your RecipeBookMaker sign-in link",
      text: `Sign in to RecipeBookMaker:\n${url}\n\nThis link expires in 24 hours. If you didn't request it, you can ignore this email.`,
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:#1c1917;padding:28px 32px;text-align:center;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Recipe<span style="color:#f59e0b;">Book</span>Maker</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#1c1917;">Sign in to RecipeBookMaker</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#57534e;">Click the button below to sign in. This link works once and expires in 24 hours.</p>
          <a href="${url}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">Sign in →</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">If the button doesn't work, copy and paste this link:<br><a href="${url}" style="color:#b45309;word-break:break-all;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a8a29e;border-top:1px solid #f5f5f4;padding-top:16px;">If you didn't request this email, you can safely ignore it.</p>
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

// Lazy initialization so env vars are read fresh on every request, avoiding
// module-init timing issues on Vercel serverless.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const providers: Provider[] = [];

  if (googleEnabled) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    );
  }

  if (emailEnabled) {
    providers.push(
      ResendProvider({
        apiKey: process.env.RESEND_API_KEY!,
        from: emailFrom,
        sendVerificationRequest: sendMagicLink,
      }),
    );
  }

  return {
    adapter: PrismaAdapter(prisma as any),
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers,
    callbacks: {
      session({ session, user }) {
        if (session.user) session.user.id = user.id;
        return session;
      },
    },
    events: {
      async createUser({ user }) {
        await logActivity("account_created", user.id, { email: user.email });
      },
      async signIn({ user }) {
        await logActivity("login", user.id);
      },
    },
    pages: {
      signIn: "/login",
      verifyRequest: "/verify-request",
    },
  };
});
