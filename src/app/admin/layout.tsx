import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <div className="flex">
        <aside className="fixed top-0 left-0 h-screen w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-10">
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
          </nav>

          <div className="px-3 py-4 border-t border-zinc-800">
            <Link
              href="/songs"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <span>←</span>
              Back to app
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-56 flex-1 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
