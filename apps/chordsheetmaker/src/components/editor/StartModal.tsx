"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  /** The title typed on this screen, or "" to open the search with nothing asked yet. */
  onSearch: (query: string) => void;
  onImport: () => void;
  onWriteMyself: () => void;
  onTemplate?: () => void;
  showDemo?: boolean;
  onDemo?: () => void;
  onClose?: () => void;
}

/** One of the other ways to start. Its icon is in the blue a chord is written in. */
function Option({
  onClick, title, hint, icon,
}: { onClick: () => void; title: string; hint: string; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 px-5 py-4 rounded-lg text-left transition-colors cursor-pointer bg-white text-ink border border-rule hover:border-chord/50"
    >
      <span className="shrink-0 text-chord">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-base">{title}</span>
        <span className="block text-[13px] mt-0.5 text-stone-500">{hint}</span>
      </span>
      <span aria-hidden className="shrink-0 transition-transform group-hover:translate-x-0.5 text-stone-400">→</span>
    </button>
  );
}

export default function StartModal({ onSearch, onImport, onWriteMyself, onTemplate, showDemo = false, onDemo, onClose }: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Start in the title field, so a song is a title and Enter away. Not on a
  // touch screen, where that would raise the keyboard over the other options.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
          {/* The way we would pick for you, so it is set in ink, and the title
              is asked for right here rather than in a dialog of its own. */}
          <form
            onSubmit={(e) => { e.preventDefault(); onSearch(query.trim()); }}
            className="rounded-lg bg-ink text-paper px-5 py-4"
          >
            <label htmlFor="start-search" className="flex items-center gap-4 cursor-text">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-base">Find a song with AI</span>
                <span id="start-search-hint" className="block text-[13px] mt-0.5 text-stone-300">Type a title — chords appear in seconds</span>
              </span>
            </label>
            <div className="flex gap-2 mt-3">
              <input
                id="start-search"
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Find a song with AI"
                aria-describedby="start-search-hint"
                placeholder="e.g. Oasis Wonderwall"
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="search"
                className="flex-1 min-w-0 rounded-md bg-paper text-ink text-base px-3 py-2.5 outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-chord-light"
              />
              <button
                type="submit"
                aria-label="Find this song"
                className="group shrink-0 w-11 flex items-center justify-center rounded-md bg-paper/15 text-paper hover:bg-paper/25 transition-colors cursor-pointer"
              >
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </form>
          <Option
            onClick={onImport}
            title="I already have chords"
            hint="Paste lyrics & chords, or snap a photo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" />
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
            hint="Type your lyrics, then click to place chords"
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
