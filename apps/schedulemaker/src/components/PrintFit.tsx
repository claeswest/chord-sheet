"use client";

// Makes the sheet fit one page.
//
// A timetable belongs on one sheet on a fridge. Left alone the browser
// paginates: a full secondary-school week is taller than A4 landscape, so it
// silently spills onto a second page and breaks wherever it lands — usually
// through the middle of an hour. Nobody chose that, and nobody sees it until
// the paper comes out.
//
// So the sheet is scaled down until it fits, and only then. A complete
// schedule in slightly smaller type beats half a schedule in the right size.
//
// `zoom`, not `transform: scale()`. A transform doesn't change layout, so the
// page would still be paginated at the original height and the scaling would
// achieve nothing but a smaller drawing on two pages. zoom does change layout,
// which is the entire point here.

import { useEffect, useState } from "react";

const PX_PER_MM = 96 / 25.4;

/** Hides everything print hides, so the measurement is of what will print. */
const MEASURING = `
  html.measuring-print .no-print { display: none !important; }
  html.measuring-print .sheet { min-height: 0 !important; }
`;

export default function PrintFit({
  pageHeightMm,
  deps,
  onFit,
}: {
  pageHeightMm: number;
  /** Anything that changes the sheet's height. */
  deps: unknown;
  /** Told the factor, so the toolbar can say what will happen. */
  onFit?: (factor: number) => void;
}) {
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    const measure = () => {
      const sheet = document.querySelector<HTMLElement>(".sheet");
      if (!sheet) return;

      // Hiding everything unprintable collapses the page — here from 1490px
      // to 794px, which is barely a viewport. The browser clamps the scroll
      // position to fit the shorter document, and restoring the height does
      // not restore the scroll: every edit threw the reader back to the top.
      const scroller = document.scrollingElement ?? document.documentElement;
      const y = scroller.scrollTop;

      document.documentElement.classList.add("measuring-print");
      // Read before the class is removed; scrollHeight is the content, which
      // is what min-height was hiding.
      const natural = sheet.scrollHeight;
      document.documentElement.classList.remove("measuring-print");

      // Same task as the collapse, so the page never paints at the wrong
      // offset.
      if (scroller.scrollTop !== y) scroller.scrollTop = y;

      const available = pageHeightMm * PX_PER_MM;
      // A hair under 1 rather than exactly, so a sheet that measures precisely
      // one page doesn't round its way onto two.
      const next = natural > 0 ? Math.min(1, (available * 0.995) / natural) : 1;
      setFactor(next);
      onFit?.(next);
    };

    measure();
    // Measured again on the way into the print dialog: fonts may have settled
    // since, and the answer has to be right for the paper, not for the moment
    // the schedule happened to change.
    window.addEventListener("beforeprint", measure);
    return () => window.removeEventListener("beforeprint", measure);
  }, [pageHeightMm, deps, onFit]);

  return (
    <style>{`${MEASURING}
      @media print { .sheet { zoom: ${factor}; } }`}</style>
  );
}
