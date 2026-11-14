import type { Metadata } from "next";
import Link from "next/link";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { BTN_INK, BTN_LINE, Chorded, Eyebrow, Wordmark } from "@/components/landing/kit";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className={`${LANDING_FONTS} min-h-screen flex flex-col bg-paper text-ink`}>
      <header className="px-5 sm:px-8 py-4 border-b border-rule">
        <div className="max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home">
            <Wordmark className="text-[1.15rem] sm:text-2xl" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-5 sm:px-8 py-16">
          <Eyebrow className="mb-6">404</Eyebrow>
          <h1 className="font-display font-medium text-[2.6rem] sm:text-6xl leading-[1.42] tracking-[-0.02em] text-ink mb-4">
            This <Chorded chord="Am">page</Chorded> hit a <Chorded chord="E7"><em>wrong</em></Chorded> note
          </h1>
          <p className="text-lg text-stone-600 mb-9 max-w-md leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has moved. But the
            music doesn&apos;t have to stop here.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/editor/new" className={`${BTN_INK} px-7 py-3.5 text-base`}>
              Try the editor free <span aria-hidden>→</span>
            </Link>
            <Link href="/" className={`${BTN_LINE} px-7 py-3.5 text-base`}>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
