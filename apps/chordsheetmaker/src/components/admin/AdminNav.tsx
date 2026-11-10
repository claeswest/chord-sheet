"use client";

// The admin's three links, with the current one marked. A client component
// only because the layout is a server component and can't read the pathname:
// without this the menu looked the same on every page.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/songs", label: "Songs", icon: "🎵" },
  { href: "/admin/activity", label: "Activity", icon: "📋" },
];

export default function AdminNav({ variant }: { variant: "sidebar" | "topbar" }) {
  const pathname = usePathname();
  return (
    <>
      {ITEMS.map(({ href, label, icon }) => {
        // "/admin" is a prefix of the other two, so it only matches exactly.
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        const state = active
          ? "text-white bg-zinc-800 font-medium"
          : "text-zinc-300 hover:text-white hover:bg-zinc-800";
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "sidebar"
                ? `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${state}`
                : `px-2.5 py-1.5 rounded-lg text-sm transition-colors ${state}`
            }
          >
            {variant === "sidebar" && <span aria-hidden>{icon}</span>}
            {label}
          </Link>
        );
      })}
    </>
  );
}
