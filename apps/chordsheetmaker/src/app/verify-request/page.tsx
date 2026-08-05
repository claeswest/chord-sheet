import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email",
  description: "We've emailed you a secure link to sign in to ChordSheetMaker.",
};

export default function VerifyRequestPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl shadow-black/40 p-10 w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <svg className="h-7 w-7 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Check your email</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          We sent you a secure sign-in link. Click it on this device to continue —
          it expires in 24 hours.
        </p>

        <div className="text-left bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              try again
            </Link>
            .
          </p>
        </div>

        <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
