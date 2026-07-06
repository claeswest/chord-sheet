"use client";

import { useEffect, useState } from "react";
import CtaLink from "./CtaLink";

/**
 * Mobile-only "Try it free" pill that slides in after the visitor scrolls
 * past the hero — the landing page is ~10 screens tall on a phone with no
 * CTA between the hero and pricing. Rendered only for logged-out visitors.
 */
export default function StickyMobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <CtaLink
        from="home-sticky"
        href="/editor/new?start=demo"
        className="flex items-center gap-2 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl shadow-indigo-900/40"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
      >
        Build a chart free
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
        </svg>
      </CtaLink>
    </div>
  );
}
