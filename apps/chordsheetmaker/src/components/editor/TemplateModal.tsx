"use client";

import { TEMPLATES, type SongTemplate } from "@/data/templates";

interface Props {
  onSelect: (template: SongTemplate) => void;
  onBack: () => void;
}

export default function TemplateModal({ onSelect, onBack }: Props) {
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
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Choose a template</h2>
            <p className="text-white/40 text-xs mt-0.5">Pick a song structure to start from</p>
          </div>
        </div>

        {/* Template list */}
        <div className="space-y-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-white/70 hover:text-white border border-white/10 hover:border-indigo-400/30 hover:bg-indigo-500/10 transition-all duration-200 text-left"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-400/30 transition-colors text-lg"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white/90">{t.name}</p>
                <p className="text-xs text-white/30 mt-0.5">{t.description}</p>
              </div>
              <svg
                className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
