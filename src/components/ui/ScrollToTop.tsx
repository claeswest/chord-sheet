"use client";

import { useEffect, useState, useCallback } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
      style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      Top <kbd className="text-xs text-white/50 font-mono">[T]</kbd>
    </button>
  );
}
