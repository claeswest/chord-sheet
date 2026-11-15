"use client";

// The admin's links, with the current one marked. A client component only
// because the layout is a server component and can't read the pathname:
// without this the menu looked the same on every page.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON = "w-4 h-4 shrink-0";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ITEMS = [
  {
    href: "/admin", label: "Dashboard",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  },
  {
    href: "/admin/users", label: "Users",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></svg>,
  },
  {
    href: "/admin/songs", label: "Songs",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  },
  {
    href: "/admin/activity", label: "Activity",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>,
  },
];

export default function AdminNav({ variant }: { variant: "sidebar" | "topbar" }) {
  const pathname = usePathname();
  return (
    <>
      {ITEMS.map(({ href, label, icon }) => {
        // "/admin" is a prefix of the others, so it only matches exactly.
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        const state = active
          ? "text-ink bg-white border border-rule font-semibold"
          : "text-stone-600 border border-transparent hover:text-ink hover:bg-ink/5";
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "sidebar"
                ? `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${state}`
                : `px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${state}`
            }
          >
            {variant === "sidebar" && <span aria-hidden className={active ? "text-chord" : ""}>{icon}</span>}
            {label}
          </Link>
        );
      })}
    </>
  );
}
