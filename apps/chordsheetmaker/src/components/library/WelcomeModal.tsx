"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  onDismiss: () => void;
}

/** One way to start. The first is the one we would pick for you, so it is set in ink. */
function Option({
  href, title, hint, primary = false, icon,
}: { href: string; title: string; hint: string; primary?: boolean; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-lg text-left transition-colors ${
        primary
          ? "bg-ink text-paper hover:bg-stone-700"
          : "bg-white text-ink border border-rule hover:border-ink/40"
      }`}
    >
      <span className={`shrink-0 ${primary ? "text-paper" : "text-stone-500"}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm">{title}</span>
        <span className={`block text-xs mt-0.5 ${primary ? "text-stone-300" : "text-stone-500"}`}>{hint}</span>
      </span>
      <span aria-hidden className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${primary ? "text-paper" : "text-stone-400"}`}>→</span>
    </Link>
  );
}

export default function WelcomeModal({ onDismiss }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 bg-paper text-ink overflow-y-auto"
    >
      {/* × close button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:text-ink hover:bg-ink/5 transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative w-full max-w-sm py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">Welcome</p>
          <h2 id="welcome-heading" className="font-display font-medium text-[2.1rem] leading-[1.1] tracking-[-0.02em] text-ink">
            Let&apos;s make your first chord sheet
          </h2>
          <p className="text-stone-600 mt-3 text-[15px]">How do you want to get started?</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          <Option
            primary
            href="/editor/new?start=search"
            title="Find a song with AI"
            hint="Type a title — chords appear in seconds"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            }
          />
          <Option
            href="/editor/new?start=import"
            title="I already have chords"
            hint="Paste lyrics & chords, or snap a photo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            }
          />
          <Option
            href="/editor/new?start=write"
            title="Build from scratch"
            hint="Type your lyrics, then click or drag to place chords"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            }
          />
          {/* Demo — the instant wow, no work required */}
          <Option
            href="/editor/new?start=demo"
            title="Just show me a demo"
            hint="Play with a finished chart — no work required"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7z" />
              </svg>
            }
          />
        </div>

        {/* Footer — sign in only, × handles dismiss */}
        <div className="mt-7 pt-6 border-t border-rule">
          <Link href="/login" className="text-sm text-stone-600 hover:text-ink transition-colors">
            Already have an account? <span className="font-semibold text-ink underline underline-offset-4 decoration-ink/30">Sign in</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
