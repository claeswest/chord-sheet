import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string }>;
}) {
  const { u, t } = await searchParams;
  let ok = false;

  if (u && t && verifyUnsubscribeToken(u, t)) {
    try {
      await prisma.user.update({ where: { id: u }, data: { marketingOptOut: true } });
      ok = true;
    } catch {
      ok = false;
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
    >
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl shadow-black/40 p-10 w-full max-w-sm text-center">
        <div className="text-2xl font-bold tracking-tight mb-6">
          Chord<span className="text-indigo-600">SheetMaker</span>
        </div>
        {ok ? (
          <>
            <p className="text-4xl mb-4" aria-hidden>✅</p>
            <h1 className="text-xl font-bold text-zinc-900 mb-2">You&apos;re unsubscribed</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              We won&apos;t send you any more tips or offers. You&apos;ll still receive
              essential account emails (like sign-in links).
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl mb-4" aria-hidden>🤔</p>
            <h1 className="text-xl font-bold text-zinc-900 mb-2">That link didn&apos;t work</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              The unsubscribe link seems invalid or expired. Try the link in the
              latest email, or contact{" "}
              <a href="mailto:claes@clavos.se" className="text-indigo-600">claes@clavos.se</a>.
            </p>
          </>
        )}
        <div className="mt-8 pt-6 border-t border-zinc-100">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
            ← Back to ChordSheetMaker
          </Link>
        </div>
      </div>
    </div>
  );
}
