import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/landing/AuthShell";

export const metadata: Metadata = {
  title: "Check your email",
  description: "We've emailed you a secure link to sign in to ChordSheetMaker.",
};

export default function VerifyRequestPage() {
  return (
    <AuthShell>
        <svg aria-hidden className="h-7 w-7 text-chord mb-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>

        <h1 className="font-display font-medium text-[2rem] leading-tight tracking-[-0.02em] text-ink mb-3">Check your email</h1>
        <p className="text-[15px] text-stone-600 leading-relaxed mb-6">
          We sent you a secure sign-in link. Click it on this device to continue —
          it expires in 24 hours.
        </p>

        <div className="border-l-2 border-rule bg-paper pl-4 pr-3 py-3 mb-6">
          <p className="text-sm text-stone-600 leading-relaxed">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
              try again
            </Link>
            .
          </p>
        </div>

        <Link href="/login" className="text-sm text-stone-600 hover:text-ink transition-colors">
          ← Back to sign in
        </Link>
    </AuthShell>
  );
}
