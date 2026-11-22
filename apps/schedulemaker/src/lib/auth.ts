// NextAuth wiring for Fixa schemat.
//
// A copy of RecipeBookMaker's, which is a copy of ChordSheetMaker's — on
// purpose, see the note at the top of apps/recipemaker/src/lib/auth.ts.
//
// An account here is optional and always will be. The app's first promise is
// that a schedule can be made, printed and thrown away with nobody knowing;
// signing in is for the person who wants to find it again next term.
//
// Providers are added only when their credentials exist, and the whole thing
// is off unless there is a database to sign in to. So the app builds, deploys
// and behaves exactly as it did before accounts until someone has set up the
// database and at least one way to sign in — see `accountsEnabled`.

import NextAuth from "next-auth";
import { connection } from "next/server";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { planFromUser, type Plan } from "./plans";
import { isPlusTheme } from "./themes";
import type { SheetState } from "./sheetState";

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/** Passwordless sign-in by an emailed link, enabled once a Resend key is present. */
export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

const databaseEnabled = Boolean(process.env.DATABASE_URL);

/**
 * Whether this deployment has accounts at all.
 *
 * False means: no "Logga in", no "Spara", no "Mina scheman" — the app as it
 * was. It takes a database and a session secret; without a way to sign in as
 * well there would be a login page with no buttons on it.
 */
export const accountsEnabled =
  databaseEnabled &&
  Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET) &&
  // On a laptop the pages are worth having before Google or the mail service
  // is set up; the login page then says what is missing instead of offering
  // buttons. Deployed, no way to sign in means no accounts.
  (googleEnabled || emailEnabled || process.env.NODE_ENV !== "production");

const emailFrom = process.env.EMAIL_FROM ?? "Fixa schemat <onboarding@resend.dev>";

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
      subject: "Din inloggningslänk till Fixa schemat",
      text: `Logga in på Fixa schemat:\n${url}\n\nLänken gäller i 24 timmar och fungerar en gång. Om det inte var du som bad om den kan du strunta i det här mejlet.`,
      html: `<!doctype html><html lang="sv"><body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <span style="font-size:18px;font-weight:700;color:#1a1a1a;">Fixa schemat</span>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Logga in</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#45454f;">Tryck på knappen för att logga in. Länken fungerar en gång och gäller i 24 timmar.</p>
          <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:999px;">Logga in →</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6b6b;">Fungerar inte knappen? Kopiera den här länken:<br><a href="${url}" style="color:#3b5bdb;word-break:break-all;">${url}</a></p>
          <p style="margin:20px 0 0;font-size:12px;color:#6b6b6b;border-top:1px solid #ececf0;padding-top:16px;">Var det inte du som bad om det här mejlet kan du strunta i det.</p>
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
export const { handlers, auth: nextAuth, signIn, signOut } = NextAuth(() => {
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
        // That an account was made, not whose: the address is on the User row
        // and goes when the account does. A copy here would outlive it.
        await logActivity("account_created", user.id);
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

/**
 * Who is signed in, or null.
 *
 * Every route and page asks this rather than NextAuth directly, for one
 * reason: where there is no database there is no session table to look in,
 * and asking would throw. A deployment without accounts answers "nobody"
 * without touching anything.
 */
export async function currentUserId(): Promise<string | null> {
  // Who is asking is only known when someone asks. Without this line a page
  // that calls here is built once, at deploy time, with nobody signed in — and
  // that answer is then served to everyone: "Mina scheman" sent every signed-in
  // person back to the login page. It did so only in a production build, where
  // the try below quietly swallowed the framework's "this needs a request"
  // signal; in development every page is rendered per request and it worked.
  await connection();
  if (!databaseEnabled) return null;
  try {
    const session = await nextAuth();
    return session?.user?.id ?? null;
  } catch (e) {
    // The framework steers with thrown values of its own (redirects, the
    // signal above). Those carry a digest and are not ours to swallow.
    if (typeof e === "object" && e !== null && "digest" in e) throw e;
    console.error(`[auth] session lookup failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * The signed-in account with the plan it is on, or null.
 *
 * The plan is worked out here, on the server, every time it is asked for —
 * never taken from the browser, which can be made to say anything.
 */
export async function currentAccount(): Promise<{ id: string; email: string; plan: Plan } | null> {
  const id = await currentUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, plan: true } });
  if (!user) return null;
  return { id, email: user.email, plan: planFromUser(user) };
}

/**
 * A sheet as this plan may keep or print it.
 *
 * The one thing a plan changes about a sheet today is its style: the Plus
 * styles are for Plus. Someone on Gratis who sends one anyway — the picker
 * will not let them, so this is a request made by hand — gets the same sheet
 * in the default style. Not an error: the schedule is theirs and still wanted;
 * only the dress is not on offer.
 *
 * This is the lock. The one in the style picker is a sign on the door.
 */
export function withinPlan(state: SheetState, plan: Plan): SheetState {
  if (plan !== "plus" && isPlusTheme(state.theme)) return { ...state, theme: "" };
  return state;
}
