import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@clavos/core/unsubscribe";

// The human-facing unsubscribe. The one-click header target is the POST route
// next door; this page is what someone gets when they click "Unsubscribe" in
// the footer.
//
// It asks before it acts, unlike ChordSheetMaker's, which opts you out on page
// load. Corporate mail scanners and link previewers fetch every URL in an
// email, and there is no way for someone to opt back in afterwards — so a GET
// that silently unsubscribes can remove a customer who never clicked anything.
// One button is worth that.

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

async function unsubscribe(formData: FormData) {
  "use server";
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  if (u && t && verifyUnsubscribeToken(u, t)) {
    try {
      await prisma.user.update({ where: { id: u }, data: { marketingOptOut: true } });
    } catch {
      /* account gone — nothing left to unsubscribe */
    }
  }
  redirect("/unsubscribe?done=1");
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; done?: string }>;
}) {
  const { u, t, done } = await searchParams;
  const valid = Boolean(u && t && verifyUnsubscribeToken(u, t));

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-sunken px-6">
      <div className="w-full max-w-sm rounded-card border border-rule bg-paper-raised p-10 text-center shadow-card">
        <div className="font-display mb-6 text-2xl font-extrabold tracking-tight">
          Recipe<span className="text-accent">BookMaker</span>
        </div>

        {done ? (
          <>
            <p className="mb-4 text-4xl" aria-hidden>
              ✅
            </p>
            <h1 className="font-display mb-2 text-xl font-bold">You&apos;re unsubscribed</h1>
            <p className="text-sm leading-relaxed text-ink-muted">
              No more tips or offers. You&apos;ll still get the emails you need — sign-in
              links, and anything about a subscription you&apos;re paying for.
            </p>
          </>
        ) : valid ? (
          <>
            <h1 className="font-display mb-2 text-xl font-bold">Stop these emails?</h1>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">
              You&apos;ll still get sign-in links and anything about a subscription
              you&apos;re paying for — just no tips or offers.
            </p>
            <form action={unsubscribe}>
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-paper-raised hover:bg-accent-ink">
                Yes, unsubscribe
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 text-4xl" aria-hidden>
              🤔
            </p>
            <h1 className="font-display mb-2 text-xl font-bold">That link didn&apos;t work</h1>
            <p className="text-sm leading-relaxed text-ink-muted">
              It looks invalid or out of date. Try the link in the most recent email, or
              write to{" "}
              <a href="mailto:claes@clavos.se" className="text-accent">
                claes@clavos.se
              </a>{" "}
              and I&apos;ll take you off myself.
            </p>
          </>
        )}

        <div className="mt-8 border-t border-rule pt-6">
          <Link href="/" className="text-sm text-ink-faint hover:text-ink">
            ← Back to RecipeBookMaker
          </Link>
        </div>
      </div>
    </div>
  );
}
