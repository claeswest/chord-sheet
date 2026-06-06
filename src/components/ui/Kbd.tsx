import type { ReactNode } from "react";

/**
 * A small keyboard key-cap, e.g. <Kbd>P</Kbd>. Styled for dark/coloured
 * backgrounds (toolbar, viewer controls, gradient buttons).
 */
export default function Kbd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[1.1rem] px-1.5 py-0.5 rounded bg-white/20 text-white text-[11px] font-mono leading-none align-middle ${className}`}
    >
      {children}
    </kbd>
  );
}
