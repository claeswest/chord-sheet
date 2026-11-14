"use client";

import { TEMPLATES, type SongTemplate } from "@/data/templates";

interface Props {
  onSelect: (template: SongTemplate) => void;
  onBack: () => void;
}

export default function TemplateModal({ onSelect, onBack }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-heading"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 bg-paper text-ink overflow-y-auto"
    >
      <div className="relative w-full max-w-sm py-10">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-5 -ml-1 inline-flex items-center gap-1.5 px-1 py-1 text-sm text-stone-600 hover:text-ink transition-colors cursor-pointer"
          >
            <span aria-hidden>←</span> Back
          </button>
          <h2 id="template-heading" className="font-display font-medium text-[2.1rem] leading-[1.1] tracking-[-0.02em] text-ink">
            Choose a template
          </h2>
          <p className="text-stone-600 mt-3 text-[15px]">Pick a song structure to start from</p>
        </div>

        {/* Template list */}
        <div className="space-y-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="group w-full flex items-center gap-4 px-5 py-4 rounded-lg bg-white text-ink border border-rule hover:border-ink/40 transition-colors text-left cursor-pointer"
            >
              <span className="shrink-0 text-lg" aria-hidden>{t.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm">{t.name}</span>
                <span className="block text-xs text-stone-500 mt-0.5">{t.description}</span>
              </span>
              <span aria-hidden className="shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
