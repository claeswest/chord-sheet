import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

// The one bar every page of the app carries.
//
// It exists because there was no way to sign out at all — signOut was exported
// from lib/auth and never called from anywhere — and no way to reach the
// pricing page except by filling up the free tier and reading the notice.
//
// A server component so the sign-out can be a server action rather than a
// client round-trip; <header><nav> rather than a div because the print
// stylesheet hides that selector, so it disappears from a printed recipe
// without needing to know this component exists.

export default async function AppHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <header className="no-print border-b border-rule bg-paper">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3">
        <Link href={signedIn ? "/recipes" : "/"} className="font-display text-lg font-extrabold">
          Recipe<span className="text-accent">Book</span>Maker
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {signedIn && (
            <Link href="/recipes" className="text-ink-muted hover:text-ink">
              Recipes
            </Link>
          )}
          {/* Only for the people in ADMIN_EMAILS. The layout under /admin
              refuses everyone else anyway; hiding the link keeps it from being
              a thing everyone sees and nobody can use. */}
          {(await isAdmin()) && (
            <Link href="/admin" className="text-ink-muted hover:text-ink">
              Admin
            </Link>
          )}
          <Link href="/pricing" className="text-ink-muted hover:text-ink">
            Pricing
          </Link>

          {signedIn ? (
            <>
              {/* Which account, in case someone has two. Quiet enough to ignore. */}
              <span className="hidden text-ink-faint sm:inline">{session?.user?.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-ink-muted hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-rule px-4 py-1.5 font-semibold hover:border-ink-faint"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
