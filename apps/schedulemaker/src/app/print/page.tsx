"use client";

// The sheet and nothing else, for a browser that is about to print it.
//
// This page is not for people. /api/pdf opens it in a headless browser on the
// server, hands it a schedule, and prints it to a PDF — which is exactly what
// "Skriv ut" followed by "Spara som PDF" does on a parent's own computer, and
// the only way to get a PDF whose text is text.
//
// It renders the same ScheduleSheet with the same PrintFit as step three of
// the app, so there is still one layout. That was the condition for doing this
// at all: a second drawing of the sheet, in a PDF library's own terms, would
// drift from the first, and the drift would show up as a wrong timetable on
// somebody's fridge.
//
// The schedule is handed over as a value on `window`, set by the server's
// browser before this page's code runs. Not in the address and not in
// storage: nothing about it should outlive the few seconds the page exists.
// Opened by hand, with no schedule, it shows nothing.

import { useEffect, useState } from "react";
import PrintFit from "@/components/PrintFit";
import ScheduleSheet from "@/components/ScheduleSheet";
import { cleanState, paperOf, type SheetState } from "@/lib/sheetState";

declare global {
  interface Window {
    __SHEET_STATE__?: unknown;
  }
}

export default function PrintPage() {
  const [state, setState] = useState<SheetState | null>(null);

  useEffect(() => {
    setState(cleanState(window.__SHEET_STATE__));
  }, []);

  // Tells the server's browser when to press print. The sheet lays itself out
  // by measuring: cards shrink to fit their minutes, the day stretches to fill
  // the page, and both run again once the style's fonts have arrived. Printing
  // before that has settled gives a PDF of a sheet halfway through fitting.
  useEffect(() => {
    if (!state) return;
    let live = true;
    const frames = (n: number) =>
      new Promise<void>((done) => {
        const step = (left: number) => (left === 0 ? done() : requestAnimationFrame(() => step(left - 1)));
        step(n);
      });
    (async () => {
      await document.fonts.ready;
      await frames(3);
      // A font that started loading because of the first layout.
      await document.fonts.ready;
      await frames(3);
      if (live) document.documentElement.dataset.ready = "1";
    })();
    return () => {
      live = false;
    };
  }, [state]);

  if (!state) return null;
  const paper = paperOf(state.paper);

  return (
    <main className="app">
      {/* As in the app: @page cannot be set from a class, so the size is
          written out, and the sheet is given the paper's width to lay out in. */}
      <style>{`@page { size: ${paper.css}; margin: 0; }
        .sheet { width: ${paper.w}; min-height: ${paper.h}; }`}</style>
      <PrintFit
        pageHeightMm={parseInt(paper.h, 10)}
        pageWidthMm={parseInt(paper.w, 10)}
        deps={`${state.paper}|${state.theme}|${state.ink}|${state.icons}|${state.illustration}`}
      />
      <div
        className="sheet-theme"
        data-theme={state.theme || undefined}
        data-ink={state.ink ? "save" : undefined}
      >
        <ScheduleSheet
          schedule={state.schedule}
          glossary={state.glossary}
          icons={state.icons}
          theme={state.theme}
          illustration={state.illustration}
        />
      </div>
    </main>
  );
}
