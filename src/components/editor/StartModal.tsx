"use client";

import Link from "next/link";

interface Props {
  onSearch: () => void;
  onImport: () => void;
  onWriteMyself: () => void;
}

export default function StartModal({ onSearch, onImport, onWriteMyself }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md px-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
              <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">New chord sheet</h2>
          <p className="text-zinc-500 mt-1.5 text-sm">How do you want to start?</p>
        </div>

        {/* Options */}
        <div className="space-y-3">

          {/* Search */}
          <button
            onClick={onSearch}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-left shadow-md group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Find a song</p>
              <p className="text-xs text-indigo-200 mt-0.5">Find any song's chords with AI</p>
            </div>
            <svg className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Import */}
          <button
            onClick={onImport}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200 transition-colors text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Import chord sheet</p>
              <p className="text-xs text-zinc-400 mt-0.5">Paste text · Upload image · Clipboard</p>
            </div>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Write myself */}
          <button
            onClick={onWriteMyself}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200 transition-colors text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">I'll write it myself</p>
              <p className="text-xs text-zinc-400 mt-0.5">Start with a blank editor</p>
            </div>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/songs"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to songs
          </Link>
        </div>

      </div>
    </div>
  );
}
