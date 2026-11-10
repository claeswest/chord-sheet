import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import BuildStamp from "@clavos/core/build-stamp";
import AdminNav from "@/components/admin/AdminNav";
import type { Metadata } from "next";

// The browser tab said "AI Chord Sheets for Musicians" on every admin page.
export const metadata: Metadata = {
  title: "Admin", // the root layout appends " | ChordSheetMaker"
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  // color-scheme: dark, or the browser draws its own controls for a light page:
  // the date pickers' calendar icons were black on near-black, and scrollbars
  // bright white.
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      {/* Desktop sidebar (hidden on small screens) */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-56 bg-zinc-900 border-r border-zinc-800 flex-col z-10">
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">𝄞</span>
            <span className="font-bold text-white text-sm">Admin</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">ChordSheetMaker</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <AdminNav variant="sidebar" />
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800">
          <Link
            href="/songs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>←</span>
            Back to app
          </Link>
          <BuildStamp
            showAbsolute
            className="block px-3 mt-3 text-[10px] leading-relaxed text-zinc-600 font-mono"
          />
        </div>
      </aside>

      {/* Mobile top bar (hidden on large screens) */}
      <header className="lg:hidden sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 px-4 h-14">
          <span className="text-lg">𝄞</span>
          <span className="font-bold text-white text-sm mr-1">Admin</span>
          <nav className="flex items-center gap-1">
            <AdminNav variant="topbar" />
          </nav>
          <Link
            href="/songs"
            className="ml-auto text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
          >
            ← App
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-56 min-h-screen">{children}</main>
    </div>
  );
}
