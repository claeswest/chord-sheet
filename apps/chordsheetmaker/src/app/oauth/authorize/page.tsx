import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseFeature, planFromUser } from "@/lib/plans";
import {
  AUTHORIZE_FIELDS, authorizeProblem, isThisComputer, readAuthorizeRequest, returnAddressAllowed, userAccessOn,
} from "@/lib/oauth";
import { findAppClient } from "@/lib/appClients";
import AuthShell from "@/components/landing/AuthShell";

// The Allow page: where a person decides whether an AI app (ChatGPT, Claude)
// may use their songs. An app sends the browser here; nothing the app put in
// the address is believed until it has been checked (lib/oauth.ts).
//
// What the page must get right is that the person can tell who is asking. An
// app's name is only what it calls itself, so the page also shows the site the
// person will be sent back to, which the app cannot make up: it is where the
// key will actually go.
//
// The two buttons post to /api/oauth/decision, which checks everything again.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an app",
  robots: { index: false, follow: false },
};

/** The address the site is being served from, as the browser sees it. */
async function pageOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "chordsheetmaker.ai";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  return `${h.get("x-forwarded-proto") ?? (local ? "http" : "https")}://${host}`;
}

function Stop({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AuthShell>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-3">Connect an app</p>
      <h1 className="font-display font-medium text-[1.75rem] leading-tight tracking-[-0.02em] text-ink mb-3">{title}</h1>
      <div className="text-[15px] text-stone-600 leading-relaxed space-y-3">{children}</div>
      <p className="mt-7 pt-6 border-t border-rule text-sm">
        <Link href="/songs" className="text-stone-600 hover:text-ink underline underline-offset-4 decoration-ink/25 hover:decoration-ink transition-colors">
          Go to my songs
        </Link>
      </p>
    </AuthShell>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!userAccessOn()) notFound();

  const query = await searchParams;
  const ask = readAuthorizeRequest((key) => query[key]);
  const origin = await pageOrigin();

  const problem = authorizeProblem(ask, origin);
  if (problem) {
    return (
      <Stop title="This link did not work">
        <p>{problem}</p>
        <p>Nothing has been connected. Go back to the app and try connecting again.</p>
      </Stop>
    );
  }

  // Sign in first, and come back here with the same request. The app is only
  // looked up for someone who is signed in: looking it up can mean fetching
  // from an address the link named, which is not done for just anyone.
  const session = await auth();
  if (!session?.user?.id) {
    const here = new URLSearchParams();
    for (const key of AUTHORIZE_FIELDS) if (ask[key]) here.set(key, ask[key]!);
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${here}`)}`);
  }

  const [client, user] = await Promise.all([
    findAppClient(ask.client_id!),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true },
    }),
  ]);
  if (!user) redirect("/login");

  if (!client || !returnAddressAllowed(ask.redirect_uri!, client.redirectUris)) {
    return (
      <Stop title="This app could not be recognised">
        <p>
          The app that sent you here could not show who it is, or asked to send you somewhere it
          has not said it uses.
        </p>
        <p>Nothing has been connected. Go back to the app and try connecting again.</p>
      </Stop>
    );
  }

  if (!canUseFeature(planFromUser(user), "aiApps")) {
    return (
      <Stop title="Connecting apps is not part of your plan">
        <p>
          {client.name} asked to use your songs. That is included in the paid plans.{" "}
          <Link href="/pricing" className="text-ink underline underline-offset-2">See the plans</Link>.
        </p>
      </Stop>
    );
  }

  const returnAddress = new URL(ask.redirect_uri!);
  const onThisComputer = isThisComputer(returnAddress);

  return (
    <AuthShell>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-3">Connect an app</p>
      <h1 className="font-display font-medium text-[1.75rem] leading-tight tracking-[-0.02em] text-ink mb-2 break-words">
        Let {client.name} use your songs?
      </h1>
      <p className="text-sm text-stone-600 mb-6 break-all">
        You are signed in as <strong className="font-semibold text-ink">{user.email}</strong>
      </p>

      <div className="mb-6 pb-6 border-b border-rule">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2.5">It will be able to</p>
        <ul className="text-sm text-ink space-y-2">
          {["See the list of songs in your library", "Read their words and chords", "Add new songs"].map((line) => (
            <li key={line} className="flex items-baseline gap-2.5">
              <span aria-hidden className="font-semibold text-chord">✓</span>
              {line}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-stone-600 mt-3 leading-relaxed">
          It cannot change or delete a song, and it cannot see your payment details.
        </p>
      </div>

      {/* Who is really asking: the name is the app's own word, this is not. */}
      <div className={`border-l-2 pl-4 pr-3 py-3 mb-7 bg-paper ${onThisComputer ? "border-amber-500" : "border-ink/30"}`}>
        {onThisComputer ? (
          <p className="text-[13px] text-ink leading-relaxed">
            <strong className="font-semibold">This is a program on this computer</strong> (it will be
            answered at {returnAddress.host}). Allow it only if you started connecting an app
            yourself, just now.
          </p>
        ) : (
          <p className="text-[13px] text-ink leading-relaxed">
            If you allow this you are sent back to{" "}
            <strong className="font-semibold break-all">{returnAddress.hostname}</strong>. Check that
            this is the app you were using.
          </p>
        )}
      </div>

      <form method="post" action="/api/oauth/decision" className="flex flex-col gap-3">
        {AUTHORIZE_FIELDS.map((key) => (ask[key] ? <input key={key} type="hidden" name={key} value={ask[key]} /> : null))}
        <button
          type="submit"
          name="decision"
          value="allow"
          className="w-full inline-flex items-center justify-center rounded-lg bg-ink text-paper hover:bg-stone-700 py-3 text-sm font-semibold transition-colors cursor-pointer"
        >
          Allow
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="w-full inline-flex items-center justify-center rounded-lg border border-ink/25 text-ink hover:border-ink/60 py-3 text-sm font-semibold transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </form>

      <p className="text-xs text-stone-500 mt-5 text-center leading-relaxed">
        You can disconnect it at any time on{" "}
        <Link href="/account" className="underline underline-offset-2 hover:text-ink transition-colors">
          your account page
        </Link>
        .
      </p>
    </AuthShell>
  );
}
