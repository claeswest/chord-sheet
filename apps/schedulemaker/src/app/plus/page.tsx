import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { accountsEnabled, currentAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/themes";
import PlusInterest from "@/components/PlusInterest";
import SiteHeader from "@/components/SiteHeader";

// What Plus is, and the question of whether anyone wants it.
//
// Plus cannot be bought. This page says so more than once, on purpose: it
// lists one thing that exists (the extra styles) and two that do not yet, and
// a page that blurred that line would be selling something that is not there.
// The button records interest and nothing else — see components/PlusInterest.
//
// When checkout exists, the button becomes it and the "kommer" labels go. What
// each tier includes is decided in lib/plans.ts, not here; this page describes
// that file and has to be kept in step with it by hand.

export const metadata: Metadata = {
  title: "Plus – Fixa schemat",
  description:
    "Plus är för dig som gör scheman åt andra: fler stilar nu, och på väg en länk som alltid visar senaste versionen.",
};

// What it shows depends on who is signed in.
export const dynamic = "force-dynamic";

export default async function PlusPage() {
  if (!accountsEnabled) redirect("/");
  const account = await currentAccount();
  const interested = account
    ? Boolean(
        await prisma.activityLog.findFirst({
          where: { userId: account.id, type: "plus_interest" },
          select: { id: true },
        }),
      )
    : false;

  const plusStyles = THEMES.filter((t) => t.plus);

  return (
    <main className="legal plus-page">
      <SiteHeader current="start" />

      <h1>Plus</h1>
      <p className="legal-lead">
        För dig som gör scheman åt andra – en klass, ett lag, en fritidsgrupp. Allt som är gratis
        i dag förblir gratis: fota, redigera, skriv ut, dela och spara.
      </p>

      {account?.plan === "plus" && (
        <p className="plus-thanks" role="status">
          <strong>Du har Plus.</strong> De extra stilarna finns bland de andra i steg tre.
        </p>
      )}

      <section>
        <h2>Det här ingår</h2>
        <ul className="plus-list">
          <li>
            <span className="plus-tag now">Finns nu</span>
            <strong>Fler stilar.</strong> {plusStyles.map((t) => t.name).join(", ")} – utöver de
            åtta som alla har.
            <span className="plus-dots" aria-hidden>
              {plusStyles.map((t) => (
                <span key={t.id} style={{ background: t.dot }} />
              ))}
            </span>
          </li>
          <li>
            <span className="plus-tag">Kommer</span>
            <strong>En länk som alltid visar senaste versionen.</strong> Byter en lektion sal
            ändrar du det en gång, och alla som har länken ser det nya schemat. Ingen behöver få
            en ny länk.
          </li>
          <li>
            <span className="plus-tag">Kommer</span>
            <strong>Skicka ut schemat.</strong> Spara en lista med mejladresser, till exempel
            klassens föräldrar, och skicka schemat till alla på en gång.
          </li>
        </ul>
      </section>

      {account?.plan !== "plus" && (
        <section>
          <h2>Går det att köpa?</h2>
          <p>
            Inte än, och vi vet inte vad det kommer att kosta. Först vill vi veta om någon vill ha
            det. Säg till här, så hör vi av oss när Plus finns.
          </p>
          <PlusInterest signedIn={Boolean(account)} email={account?.email ?? null} interested={interested} />
        </section>
      )}

      <p className="legal-back">
        <Link href="/">← Till startsidan</Link>
      </p>
    </main>
  );
}
