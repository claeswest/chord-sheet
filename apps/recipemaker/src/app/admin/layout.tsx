import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/chrome/AppHeader";
import BuildStamp from "@clavos/core/build-stamp";
import { isAdmin } from "@/lib/admin";

// Everything under /admin is gated here, once.
//
// notFound() rather than redirect or a 403: someone who isn't an admin should
// not learn that there is an admin section. A redirect to the library confirms
// the route exists; a 404 says nothing.
//
// The gate lives in the layout so a new page under /admin is protected by
// existing rather than by remembering — the failure mode of per-page checks is
// the page someone adds later.

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <nav className="flex flex-wrap items-center gap-4 border-b border-rule pb-4 text-sm">
          <span className="font-display text-lg font-extrabold">Admin</span>
          <Link href="/admin" className="text-ink-muted hover:text-ink">
            Overview
          </Link>
          <Link href="/admin/users" className="text-ink-muted hover:text-ink">
            People
          </Link>
          <Link href="/admin/activity" className="text-ink-muted hover:text-ink">
            Activity
          </Link>
          {/* What is actually deployed. Here rather than in the app chrome:
              it answers "did my change ship", which is an admin question. */}
          <BuildStamp className="ml-auto font-mono text-[10px] text-ink-faint" />
        </nav>
        {children}
      </main>
    </>
  );
}
