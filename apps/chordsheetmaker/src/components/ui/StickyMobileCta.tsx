"use client";

import { useEffect, useState } from "react";
import CtaLink from "./CtaLink";

/**
 * Mobile-only "Try it free" pill that slides in after the visitor scrolls
 * past the hero — the landing page is ~10 screens tall on a phone with no
 * CTA between the hero and pricing. Rendered only for logged-out visitors,
 * and hidden again at the closing CTA (#get-started on the landing page).
 */
export default function StickyMobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Step aside once the closing CTA is on screen: there the pill only
    // repeated the button above it and sat on top of the footer.
    const closing = document.getElementById("get-started");
    const onScroll = () => {
      const closingInView = closing ? closing.getBoundingClientRect().top < window.innerHeight - 120 : false;
      setShow(window.scrollY > 700 && !closingInView);
    };
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
        className="flex items-center gap-2 bg-ink text-paper text-sm font-semibold px-6 py-3 rounded-lg whitespace-nowrap ring-1 ring-white/15"
        style={{ boxShadow: "0 14px 30px -10px rgba(28,25,23,0.6)" }}
      >
        Build a chart free <span aria-hidden>→</span>
      </CtaLink>
    </div>
  );
}
