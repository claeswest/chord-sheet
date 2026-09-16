"use client";

// Scales the sheet down to fit the window, on screen only.
//
// The sheet is 297mm wide because it is an A4 landscape page and printing it
// correctly is the point. On a laptop that is about 1120px, which overflows
// most windows and every phone — so on screen it is scaled, and at print time
// the transform is dropped and the page is the page again.
//
// transform rather than zoom: it is unambiguous across browsers and it does
// not touch layout, which is exactly why the box around it has to be sized
// from the measured sheet. Without that, a scaled sheet leaves a tall column
// of blank space under it — or, scrolling, a wide one beside it.
//
// Except on a phone, where fitting stops being worth it. See NARROW_PX.

import { useEffect, useRef, useState } from "react";

/**
 * Below this width a whole week cannot be both visible and legible, so a
 * `readable` sheet stops shrinking and scrolls sideways instead.
 *
 * Measured on a 375px phone, fitted: scale 0.30, subject names 3.7px tall,
 * the smallest text 1.8px, and the "behåll alla" button a 16 × 9px target.
 * That is not a small sheet, it is a picture of one — and the editor is the
 * sheet, so nothing on it could be read or reliably tapped. A phone turned
 * sideways and every tablet are wider than this, and still get the week at
 * once.
 */
const NARROW_PX = 640;

/** Subject names are 12.5px on the sheet; at 0.88 they are 11px on screen. */
const READABLE_SCALE = 0.88;

type Box = { scale: number; w: number; h: number; scrolls: boolean };

export default function FitToWidth({
  children,
  readable = false,
  scrollHint,
}: {
  children: React.ReactNode;
  /** Scroll sideways on a phone rather than shrink past legibility. The front
   *  page's example doesn't: there it is a preview of the whole week, and a
   *  preview you have to swipe through has stopped being one. */
  readable?: boolean;
  /** Said above the sheet, only while it actually scrolls. */
  scrollHint?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const fit = () => {
      const available = outer.current?.clientWidth ?? 0;
      const sheet = inner.current?.firstElementChild as HTMLElement | null;
      if (!available || !sheet) return;
      // Never scale up: a sheet larger than life on a wide monitor is not
      // more useful, just blurrier about what will actually print.
      const fitted = Math.min(1, available / sheet.offsetWidth);
      const scale = readable && available < NARROW_PX ? Math.max(fitted, READABLE_SCALE) : fitted;
      const next: Box = {
        scale,
        w: sheet.offsetWidth * scale,
        h: sheet.offsetHeight * scale,
        scrolls: scale > fitted + 0.001,
      };
      setBox((prev) =>
        prev && prev.scale === next.scale && prev.w === next.w && prev.h === next.h ? prev : next,
      );
    };

    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    // The sheet's own height changes as lessons are added, and with the paper.
    if (inner.current?.firstElementChild) ro.observe(inner.current.firstElementChild);
    return () => ro.disconnect();
  }, [children, readable]);

  return (
    <>
      {box?.scrolls && scrollHint && <p className="hint fit-hint no-print">{scrollHint}</p>}
      <div ref={outer} className={`fit-outer ${box?.scrolls ? "scrolls" : ""}`}>
        {/* The scaled size, as a real box. A transform leaves the sheet's
            layout at 297mm, and a scroller measures layout — without this it
            would scroll on into three hundred pixels of nothing. */}
        <div className="fit-size" style={{ width: box?.scrolls ? box.w : undefined, height: box?.h }}>
          <div ref={inner} className="fit-inner" style={{ transform: `scale(${box?.scale ?? 1})` }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
