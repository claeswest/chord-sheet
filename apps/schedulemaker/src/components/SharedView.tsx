"use client";

// What someone sees who opens a link that always shows the latest version.
//
// The sheet, exactly as its owner saved it, and two things to do with it:
// print it, or make a schedule of one's own from it. No account, no editor,
// nothing to sign in to — the person opening this was sent a link by a teacher
// or a coach and wants to see when Tuesday starts.
//
// It is the same ScheduleSheet with the same PrintFit as the editor's step
// three, so what the owner saw is what this shows and what it prints.

import { useState } from "react";
import Link from "next/link";
import FitToWidth from "@/components/FitToWidth";
import { LogoMark, SITE_NAME } from "@/components/Logo";
import PrintFit from "@/components/PrintFit";
import ScheduleSheet from "@/components/ScheduleSheet";
import { PrintIcon } from "@/components/UiIcon";
import { packSchedule } from "@/lib/share";
import { paperOf, type SheetState } from "@/lib/sheetState";

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

export default function SharedView({ state, updated }: { state: SheetState; updated: string }) {
  const paper = paperOf(state.paper);
  const [copying, setCopying] = useState(false);

  /**
   * "Gör ett eget": hand the schedule to the editor the way a shared copy
   * arrives (lib/share.ts) — without the name across the top and with every
   * choice open again, because the schedule one makes from a teacher's is
   * one's own child's. The editor says so in its banner, and asks first if
   * this browser already holds a schedule.
   */
  async function makeOwn() {
    setCopying(true);
    try {
      const payload = await packSchedule(state.schedule, state.glossary);
      window.location.href = `/schema#s=${payload}`;
    } catch {
      setCopying(false);
    }
  }

  return (
    <main className="app shared-page">
      <style>{`@page { size: ${paper.css}; margin: 0; }
        .sheet { width: ${paper.w}; min-height: ${paper.h}; }`}</style>

      <header className="site-header no-print">
        <Link href="/" className="site-home" aria-label={`${SITE_NAME} – till startsidan`}>
          <LogoMark size={28} />
          <span className="wordmark">{SITE_NAME}</span>
        </Link>
        <div className="shared-actions">
          <button onClick={makeOwn} disabled={copying}>
            {copying ? "Öppnar…" : "Gör ett eget av det här"}
          </button>
          <button className="primary with-icon" onClick={() => window.print()}>
            <PrintIcon />
            Skriv ut
          </button>
        </div>
      </header>

      <PrintFit
        pageHeightMm={parseInt(paper.h, 10)}
        pageWidthMm={parseInt(paper.w, 10)}
        deps={updated}
      />

      <FitToWidth readable scrollHint="Svep åt sidan för att se hela veckan.">
        <div className="sheet-theme" data-theme={state.theme || undefined} data-ink={state.ink ? "save" : undefined}>
          <ScheduleSheet
            schedule={state.schedule}
            glossary={state.glossary}
            icons={state.icons}
            theme={state.theme}
            illustration={state.illustration}
          />
        </div>
      </FitToWidth>

      <p className="hint shared-foot no-print">
        Det här schemat visas via en länk och är alltid den senast sparade versionen. Senast ändrat{" "}
        {dateOf(updated)}.
      </p>
    </main>
  );
}
