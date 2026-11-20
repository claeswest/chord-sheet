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
  pageWidthMm,
  deps,
  onFit,
}: {
  pageHeightMm: number;
  /** The paper's width. With it, a shrunk sheet still reaches both edges. */
  pageWidthMm?: number;
  /** Anything that changes the sheet's height. */
  deps: unknown;
  /** Told the factor, so the toolbar can say what will happen. */
  onFit?: (factor: number) => void;
}) {
  const [factor, setFactor] = useState(1);
  /** The sheet's own paper colour, for the part of the page it does not cover. */
  const [paperColor, setPaperColor] = useState("#ffffff");

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
      setPaperColor(getComputedStyle(sheet).backgroundColor || "#ffffff");
      onFit?.(next);
    };

    measure();
    // Measured again on the way into the print dialog: fonts may have settled
    // since, and the answer has to be right for the paper, not for the moment
    // the schedule happened to change.
    let active = true;
    document.fonts.ready.then(() => { if (active) measure(); });
    document.fonts.addEventListener("loadingdone", measure);
    window.addEventListener("beforeprint", measure);
    return () => {
      active = false;
      document.fonts.removeEventListener("loadingdone", measure);
      window.removeEventListener("beforeprint", measure);
    };
  }, [pageHeightMm, deps, onFit]);

  // A shrunk sheet used to keep the paper's width and so came out narrower
  // than the page: at 96% there was a strip of bare paper down the right-hand
  // side. On a white style nobody could see it. On Skymning it was a white
  // stripe along a dark page, and it was only noticed when the server started
  // printing PDFs and one of them was looked at closely.
  //
  // So the sheet is laid out wider by the same factor it is shrunk by, which
  // is the paper's width again once zoomed, and the page behind it is given
  // the sheet's own colour — for the last half-millimetre at the bottom, which
  // is left on purpose so that rounding cannot push the sheet onto a second
  // page.
  const fill = pageWidthMm
    ? `width: ${pageWidthMm / factor}mm; min-height: ${(pageHeightMm * 0.99) / factor}mm;`
    : "";
  return (
    <style>{`${MEASURING}
      @media print {
        html, body {
          background: ${paperColor} !important;
          print-color-adjust: exact; -webkit-print-color-adjust: exact;
        }
        .sheet { zoom: ${factor}; ${fill} }
      }`}</style>
  );
}
