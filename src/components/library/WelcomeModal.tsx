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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-900/60"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
              <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Let's make your first chord sheet</h2>
          <p className="text-white/50 mt-2 text-sm leading-relaxed max-w-xs">
            How do you want to get started?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">

          {/* Find a song — primary */}
          <Link
            href="/editor/new"
            className="relative overflow-hidden group w-full flex items-center gap-4 p-5 rounded-2xl text-white transition-all duration-200 text-left shadow-lg shadow-indigo-900/50 hover:scale-[1.02] hover:shadow-indigo-500/40"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
              style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)" }} />
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="font-semibold text-sm">Find a song with AI</p>
              <p className="text-xs text-indigo-200 mt-0.5">Type a title and artist — chords appear in seconds</p>
            </div>
            <svg className="relative w-4 h-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Import */}
          <Link
            href="/editor/new"
            className="group w-full flex items-center gap-4 p-5 rounded-2xl text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-left"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">I already have chords</p>
              <p className="text-xs text-white/35 mt-0.5">Paste text, upload a photo or image</p>
            </div>
            <svg className="w-4 h-4 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Write myself */}
          <Link
            href="/editor/new"
            className="group w-full flex items-center gap-4 p-5 rounded-2xl text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-left"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Build from scratch</p>
              <p className="text-xs text-white/35 mt-0.5">Blank editor — drag and drop chords yourself</p>
            </div>
            <svg className="w-4 h-4 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>

        </div>

        {/* Footer links */}
        <div className="mt-7 flex items-center justify-center gap-5">
          <Link href="/login" className="text-sm text-indigo-300 hover:text-white transition-colors font-medium">
            Already have an account? Sign in
          </Link>
          <span className="text-white/15">·</span>
          <button
            onClick={onDismiss}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
