"use client";

import type { ReactNode } from "react";

interface Props {
  onSearch: () => void;
  onImport: () => void;
  onWriteMyself: () => void;
  onTemplate?: () => void;
  showDemo?: boolean;
  onDemo?: () => void;
  onClose?: () => void;
}

/** One way to start. The first is the one we would pick for you, so it is set in ink. */
function Option({
  onClick, title, hint, primary = false, icon,
}: { onClick: () => void; title: string; hint: string; primary?: boolean; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-lg text-left transition-colors cursor-pointer ${
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
    </button>
  );
}

export default function StartModal({ onSearch, onImport, onWriteMyself, onTemplate, showDemo = false, onDemo, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-heading"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 bg-paper text-ink overflow-y-auto"
    >
      {/* × close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:text-ink hover:bg-ink/5 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="relative w-full max-w-sm py-10">

        {/* Header */}
        <div className="mb-8">
          <h2 id="start-heading" className="font-display font-medium text-[2.1rem] leading-[1.1] tracking-[-0.02em] text-ink">
            New chord sheet
          </h2>
          <p className="text-stone-600 mt-3 text-[15px]">How do you want to get started?</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          <Option
            primary
            onClick={onSearch}
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
            onClick={onImport}
            title="I already have chords"
            hint="Paste lyrics & chords, or snap a photo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8-3-3m3 3 3-3" />
              </svg>
            }
          />
          {onTemplate && (
            <Option
              onClick={onTemplate}
              title="Use a template"
              hint="Pick a song structure to start from"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              }
            />
          )}
          <Option
            onClick={onWriteMyself}
            title="Build from scratch"
            hint="Type your lyrics, then click or drag to place chords"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            }
          />
        </div>

        {/* Footer */}
        {showDemo && onDemo && (
          <div className="mt-7 pt-6 border-t border-rule">
            <button
              onClick={onDemo}
              className="text-sm font-semibold text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink transition-colors cursor-pointer"
            >
              Explore with a demo song
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
