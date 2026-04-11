"use client";

import Link from "next/link";

interface Props {
  onSearch: () => void;
  onImport: () => void;
  onWriteMyself: () => void;
  showDemo?: boolean;
  onDemo?: () => void;
}

export default function StartModal({ onSearch, onImport, onWriteMyself, showDemo = false, onDemo }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header — dark navy, matches ImportModal */}
        <div className="px-6 py-5" style={{ background: "#302b63" }}>
          <h2 className="text-lg font-semibold text-white">New chord sheet</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>How do you want to start?</p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">

          <button
            onClick={onSearch}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Find a song</p>
              <p className="text-xs text-zinc-400 mt-0.5">Search by artist and title · AI powered</p>
            </div>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={onImport}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Import from web or photo</p>
              <p className="text-xs text-zinc-400 mt-0.5">Paste text or upload a photo</p>
            </div>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={onWriteMyself}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Start with a blank sheet</p>
              <p className="text-xs text-zinc-400 mt-0.5">Type your own chords and lyrics</p>
            </div>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

        </div>

        {/* Demo link — only for first-time users */}
        {showDemo && onDemo && (
          <div className="px-4 pb-2 text-center">
            <button
              onClick={onDemo}
              className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              ✦ Explore with a demo song
            </button>
          </div>
        )}

        {/* Back link */}
        <div className="pb-4 text-center">
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
