import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import BuildStamp from "@/components/ui/BuildStamp";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar (hidden on small screens) */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-56 bg-zinc-900 border-r border-zinc-800 flex-col z-10">
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">𝄞</span>
            <span className="font-bold text-white text-sm">Admin</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">ChordSheet Creator</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>📊</span>
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>👥</span>
            Users
          </Link>
          <Link
            href="/admin/activity"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>📋</span>
            Activity
          </Link>
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
            <Link
              href="/admin"
              className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Users
            </Link>
            <Link
              href="/admin/activity"
              className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Activity
            </Link>
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
