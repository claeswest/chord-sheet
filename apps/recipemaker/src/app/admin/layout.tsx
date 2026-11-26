import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/chrome/AppHeader";
import BuildStamp from "@clavos/core/build-stamp";
import { isAdmin } from "@/lib/admin";

// The admin chrome, and the first of two gates.
//
// notFound() rather than redirect or a 403: someone who isn't an admin should
// not learn that there is an admin section. A redirect to the library confirms
// the route exists; a 404 says nothing.
//
// THIS GATE IS NOT ENOUGH ON ITS OWN, and until 26 Nov 2026 it was the only
// one. Next renders a page without its layout when the request says the
// browser already has that layout — which is how moving between two admin
// pages works, and which anyone can say in a request header, signed in or
// not. Asked that way, a page under /admin answered with its contents and this
// file never ran. So every page under /admin starts with `await
// requireAdmin()` (lib/admin.ts), and a new page must too: the check here
// keeps the nav from being drawn for a stranger, the check in the page is what
// protects the data.

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
