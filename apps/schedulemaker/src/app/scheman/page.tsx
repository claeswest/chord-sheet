import { redirect } from "next/navigation";
import Link from "next/link";
import { accountsEnabled, currentAccount, signOut } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import SiteHeader from "@/components/SiteHeader";
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
  const user = await currentAccount();
  if (!user) redirect("/login");

  return (
    <main className="app saved-page">
      <SiteHeader current="saved" />
      <header className="saved-head">
        <h1>Mina scheman</h1>
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

      <SavedSchedules />

      {/* Said quietly, under the list: which plan this is, and that there is
          another. Not above it — the schedules are what this page is for. */}
      <p className="saved-plan hint">
        Du har {PLANS[user.plan].name}.{" "}
        {user.plan === "plus" ? (
          <Link href="/plus">Vad som ingår</Link>
        ) : (
          <>
            Gör du scheman åt andra? <Link href="/plus">Läs om Plus</Link>
          </>
        )}
      </p>
    </main>
  );
}
