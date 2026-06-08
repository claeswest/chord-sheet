import type { ReactNode } from "react";

/**
 * A small keyboard key-cap, e.g. <Kbd>P</Kbd>.
 *  - variant="dark"  (default): white cap for dark/coloured backgrounds.
 *  - variant="light": subtle grey cap for light backgrounds (e.g. menus).
 */
export default function Kbd({
  children,
  variant = "dark",
  className = "",
}: {
  children: ReactNode;
  variant?: "dark" | "light";
  className?: string;
}) {
  const tone =
    variant === "light"
      ? "bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200"
      : "bg-white/20 text-white";
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[1.1rem] px-1.5 py-0.5 rounded text-[11px] font-mono leading-none align-middle ${tone} ${className}`}
    >
      {children}
    </kbd>
  );
}
