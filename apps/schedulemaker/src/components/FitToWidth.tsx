"use client";

// Scales the sheet down to fit the window, on screen only.
//
// The sheet is 297mm wide because it is an A4 landscape page and printing it
// correctly is the point. On a laptop that is about 1120px, which overflows
// most windows and every phone — so on screen it is scaled, and at print time
// the transform is dropped and the page is the page again.
//
// transform rather than zoom: it is unambiguous across browsers and it does
// not touch layout, which is exactly why the wrapper's height has to be set
// from the measured height. Without that, a scaled sheet leaves a tall column
// of blank space under it.

import { useEffect, useRef, useState } from "react";

export default function FitToWidth({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fit = () => {
      const available = outer.current?.clientWidth ?? 0;
      const sheet = inner.current?.firstElementChild as HTMLElement | null;
      if (!available || !sheet) return;
      // Never scale up: a sheet larger than life on a wide monitor is not
      // more useful, just blurrier about what will actually print.
      const next = Math.min(1, available / sheet.offsetWidth);
      setScale(next);
      setHeight(sheet.offsetHeight * next);
    };

    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    // The sheet's own height changes when a schedule with two weeks replaces
    // one with a single week.
    if (inner.current?.firstElementChild) ro.observe(inner.current.firstElementChild);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={outer} className="fit-outer" style={{ height }}>
      <div ref={inner} className="fit-inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
