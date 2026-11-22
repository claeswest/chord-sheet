import Link from "next/link";
import { redirect } from "next/navigation";
import { accountsEnabled, currentUserId, emailEnabled, googleEnabled, signIn } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

// Signing in. Optional, and said to be: the first thing on this page is that
// a schedule can be made and printed without it.
//
// `?next=save` is how the editor's "Spara schemat" arrives here. The schedule
// being worked on stays in the browser while its owner signs in, and `/schema?spara=1`
// on the way back is what tells the editor to save it without being asked twice.

export const metadata = { title: "Logga in – Fixa schemat" };

// Rendered for each request, never at build time: what it shows depends on
// who is signed in, and on settings that exist only where it runs.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!accountsEnabled) redirect("/");
  const { next, error } = await searchParams;
  const after = next === "save" ? "/schema?spara=1" : next === "plus" ? "/plus" : "/scheman";
  if (await currentUserId()) redirect(after);

  const nothingConfigured = !googleEnabled && !emailEnabled;

  return (
    <main className="auth-page">
      <SiteHeader current="other" />
      <h1>Logga in</h1>
      <p className="auth-lead">
        Med ett konto kan du spara dina scheman och hitta dem igen nästa termin. Du behöver inget
        konto för att göra och skriva ut ett schema.
      </p>

      {error && (
        <p className="error" role="alert">
          Det gick inte att logga in. Försök igen.
        </p>
      )}

      {nothingConfigured && (
        // Only ever seen on a laptop before a sign-in method is set up — better
        // than a login page with no buttons and no explanation.
        <p className="auth-note">
          Inget sätt att logga in är inställt. Sätt <code>GOOGLE_CLIENT_ID</code> och{" "}
          <code>GOOGLE_CLIENT_SECRET</code>, eller <code>RESEND_API_KEY</code>, i{" "}
          <code>apps/schedulemaker/.env</code>.
        </p>
      )}

      {googleEnabled && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: after });
          }}
        >
          <button type="submit" className="primary auth-button">
            Fortsätt med Google
          </button>
        </form>
      )}

      {emailEnabled && (
        <form
          className="auth-email"
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: String(formData.get("email") ?? ""),
              redirectTo: after,
            });
          }}
        >
          <label>
            <span>E-postadress</span>
            <input name="email" type="email" required autoComplete="email" placeholder="du@exempel.se" />
          </label>
          <button type="submit" className={googleEnabled ? "auth-button" : "primary auth-button"}>
            Mejla mig en inloggningslänk
          </button>
        </form>
      )}

      <p className="hint auth-foot">
        Det du sparar lagras hos oss tills du tar bort det, och du kan ta bort hela kontot när du
        vill. <Link href="/integritet">Läs mer om integritet</Link>
      </p>
    </main>
  );
}
