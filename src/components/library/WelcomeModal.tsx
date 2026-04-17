"use client";

import Link from "next/link";

interface Props {
  onDismiss: () => void;
}

export default function WelcomeModal({ onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #1a1640 100%)" }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(99,102,241,0.28) 0%, transparent 70%)",
      }} />

      <div className="relative w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Icon with glow ring */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", transform: "scale(1.3)" }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Let's make your first chord sheet</h2>
          <p className="text-white/40 mt-2 text-sm">How do you want to get started?</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">

          {/* Find a song — primary */}
          <Link
            href="/editor/new?start=search"
            className="relative overflow-hidden group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-white transition-all duration-200 text-left hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 4px 24px rgba(99,102,241,0.45), 0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.13) 50%, transparent 60%)" }} />
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="font-semibold text-sm">Find a song with AI</p>
              <p className="text-xs text-indigo-200 mt-0.5">Type a title — chords appear in seconds</p>
            </div>
            <svg className="relative w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Import */}
          <Link
            href="/editor/new?start=import"
            className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-white/70 hover:text-white border border-white/10 hover:border-indigo-400/30 hover:bg-indigo-500/10 transition-all duration-200 text-left"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-400/30 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">I already have chords</p>
              <p className="text-xs text-white/30 mt-0.5">Paste lyrics & chords, or snap a photo</p>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Write myself */}
          <Link
            href="/editor/new?start=write"
            className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-white/70 hover:text-white border border-white/10 hover:border-indigo-400/30 hover:bg-indigo-500/10 transition-all duration-200 text-left"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-400/30 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Build from scratch</p>
              <p className="text-xs text-white/30 mt-0.5">Type your lyrics, then drag and drop chords</p>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

        </div>

        {/* Footer */}
        <div className="mt-7 flex flex-col items-center gap-2.5">
          <Link href="/login" className="text-sm text-indigo-300/80 hover:text-indigo-200 transition-colors">
            Already have an account? <span className="font-semibold text-indigo-300">Sign in</span>
          </Link>
          <button
            onClick={onDismiss}
            className="text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
