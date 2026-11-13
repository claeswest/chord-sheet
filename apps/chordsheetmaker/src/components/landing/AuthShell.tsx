// The frame around the three small account pages — sign in, check your email,
// sign out: the wordmark, and one card on paper.

import Link from "next/link";
import type { ReactNode } from "react";
import { LANDING_FONTS } from "./fonts";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${LANDING_FONTS} min-h-screen flex flex-col bg-paper text-ink`}>
      <header className="px-5 sm:px-8 py-4 border-b border-rule">
        <div className="max-w-6xl mx-auto w-full">
          <Link
            href="/"
            aria-label="ChordSheetMaker — home"
            className="text-lg sm:text-xl font-extrabold tracking-tight text-ink whitespace-nowrap"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            ChordSheet<span className="text-chord">Maker</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-8 sm:py-12">
        <div
          className="w-full max-w-sm rounded-xl border border-rule bg-white p-7 sm:p-9"
          style={{ boxShadow: "0 30px 50px -34px rgba(28,25,23,0.35)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
