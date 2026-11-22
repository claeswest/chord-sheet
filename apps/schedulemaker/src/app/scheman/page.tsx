import Link from "next/link";
import { redirect } from "next/navigation";
import { accountsEnabled, currentUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoMark, SITE_NAME } from "@/components/Logo";
import SavedSchedules from "@/components/SavedSchedules";

// "Mina scheman" — everything the signed-in person has saved, and the way out:
// signing out, and deleting the account with all of it.

export const metadata = {
  title: "Mina scheman – Fixa schemat",
  robots: { index: false, follow: false },
};

// Rendered for each request, never at build time: what it shows depends on
// who is signed in, and on settings that exist only where it runs.
export const dynamic = "force-dynamic";

export default async function MySchedulesPage() {
  if (!accountsEnabled) redirect("/");
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) redirect("/login");

  return (
    <main className="app saved-page">
      <header className="saved-head">
        <Link href="/" className="auth-logo" aria-label="Fixa schemat – till schemat">
          <LogoMark />
        <span>{SITE_NAME}</span>
        </Link>
        <div className="saved-who">
          <span className="hint">{user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="quiet">
              Logga ut
            </button>
          </form>
        </div>
      </header>

      <h1>Mina scheman</h1>
      <SavedSchedules />
    </main>
  );
}
