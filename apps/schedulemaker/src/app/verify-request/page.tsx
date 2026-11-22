import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// Shown after "Mejla mig en inloggningslänk". The link in the mail does the
// signing in; this page only says where to look.

export const metadata = { title: "Kolla din mejl – Fixa schemat" };

export default function VerifyRequestPage() {
  return (
    <main className="auth-page">
      <SiteHeader current="other" />
      <h1>Kolla din mejl</h1>
      <p className="auth-lead">
        Vi har skickat en länk till dig. Öppna den i den här webbläsaren, så är du inloggad – och
        schemat du höll på med finns kvar.
      </p>
      <p className="hint auth-foot">
        Kom det inget? Titta i skräpposten, eller <Link href="/login">försök igen</Link>.
      </p>
    </main>
  );
}
