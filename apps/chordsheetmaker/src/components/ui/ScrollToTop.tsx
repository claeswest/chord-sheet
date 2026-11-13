"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * `raised` lifts the button on phones so it clears a sticky bottom CTA.
 * `tone` is the surface it sits on: the app's indigo, or the landing page's ink.
 */
export default function ScrollToTop({ raised = false, tone = "indigo" }: { raised?: boolean; tone?: "indigo" | "ink" }) {
  const [visible, setVisible] = useState(false);

  const scrollToTop = useCallback(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 120);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "t" || e.key === "T") scrollToTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToTop]);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Back to top (T)"
      className={`fixed ${raised ? "bottom-20 sm:bottom-5" : "bottom-5"} right-5 z-50 flex items-center justify-center w-11 h-11 ${
        tone === "ink" ? "rounded-lg ring-1 ring-white/15" : "rounded-full shadow-lg backdrop-blur-sm hover:shadow-xl hover:scale-110"
      } transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
      style={
        tone === "ink"
          ? { background: "#1c1917", color: "#faf6ee", boxShadow: "0 10px 24px -10px rgba(28,25,23,0.6)" }
          : { background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }
      }
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
