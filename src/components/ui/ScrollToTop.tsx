"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 100);
    check(); // run on mount in case page loaded at an anchor
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 bg-white border border-zinc-200 shadow-md text-zinc-500 hover:text-zinc-900 hover:shadow-lg rounded-full w-10 h-10 flex items-center justify-center transition-all"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}
