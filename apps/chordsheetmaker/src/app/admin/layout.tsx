import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import BuildStamp from "@clavos/core/build-stamp";
import AdminNav from "@/components/admin/AdminNav";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Wordmark } from "@/components/landing/kit";
import type { Metadata } from "next";

// The browser tab said "AI Chord Sheets for Musicians" on every admin page.
export const metadata: Metadata = {
  title: "Admin", // the root layout appends " | ChordSheetMaker"
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  return (
    <div className={`${LANDING_FONTS} min-h-screen bg-paper text-ink`}>
      {/* Desktop sidebar (hidden on small screens) */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-56 bg-paper-deep border-r border-rule flex-col z-10">
        <div className="px-5 py-5 border-b border-rule">
          <Link href="/admin" aria-label="Admin — dashboard"><Wordmark className="text-lg" /></Link>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mt-1.5">Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <AdminNav variant="sidebar" />
        </nav>

        <div className="px-3 py-4 border-t border-rule">
          <Link
            href="/songs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-600 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <span aria-hidden>←</span>
            Back to the app
          </Link>
          <BuildStamp
            showAbsolute
            className="block px-3 mt-3 text-[10px] leading-relaxed text-stone-400 font-mono"
          />
        </div>
      </aside>

      {/* Mobile top bar (hidden on large screens) */}
      <header className="lg:hidden sticky top-0 z-20 bg-paper-deep border-b border-rule">
        <div className="flex items-center gap-2 px-4 h-14 overflow-x-auto">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mr-1">Admin</span>
          <nav className="flex items-center gap-1">
            <AdminNav variant="topbar" />
          </nav>
          <Link
            href="/songs"
            className="ml-auto text-xs text-stone-600 hover:text-ink transition-colors whitespace-nowrap pl-3"
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
