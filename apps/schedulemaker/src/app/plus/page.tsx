import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cancellationPending } from "@clavos/core/billing";
import { accountsEnabled, currentAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/themes";
import { CONTACT } from "@/lib/site";
import { plusPrice, priceInWords, sellingEnabled } from "@/lib/stripe";
import { confirmCheckout } from "@/lib/subscription";
import PlusBilling from "@/components/PlusBilling";
import PlusInterest from "@/components/PlusInterest";
import SiteHeader from "@/components/SiteHeader";

// What Plus is, and the way to get it.
//
// Two pages in one, and which it is depends on the server's settings
// (lib/stripe.ts, `sellingEnabled`). Where Plus is for sale, this is where it
// is bought, and where someone who has it sees when it renews and finds the
// way to end it. Where it is not, the page says so more than once and asks
// who wants it instead — see components/PlusInterest.
//
// Either way it lists what exists and what does not yet, and keeps the two
// apart: a page that blurred that line would be selling something that is not
// there.
//
// What each tier includes is decided in lib/plans.ts, not here; this page
// describes that file and has to be kept in step with it by hand. What Plus
// costs is not written here at all: it is read from Stripe.

export const metadata: Metadata = {
  title: "Plus – Fixa schemat",
  description:
    "Plus är för dig som gör scheman åt andra: fler stilar och en länk som alltid visar senaste versionen.",
};

// What it shows depends on who is signed in.
export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Stockholm",
});

export default async function PlusPage({
  searchParams,
}: {
  searchParams: Promise<{ klart?: string; tack?: string }>;
}) {
  if (!accountsEnabled) redirect("/");
  const { klart, tack } = await searchParams;

  // Back from paying. Stripe will say so itself through the webhook, but that
  // can be a few seconds behind the buyer, who would then land on a page that
  // still offers to sell them what they just bought. So the session they came
  // back with is looked up now. Then on to an address without it, so that
  // reloading the page does not ask Stripe again.
  if (klart) {
    const buyer = await currentAccount();
    if (buyer && buyer.plan !== "plus") await confirmCheckout(buyer.id, klart);
    redirect("/plus?tack=1");
  }

  const account = await currentAccount();
  const user = account
    ? await prisma.user.findUnique({
        where: { id: account.id },
        select: {
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          stripeCancelAt: true,
        },
      })
    : null;

  const onPlus = account?.plan === "plus";
  /** A subscription at Stripe, paid or not. Without one, Plus was given, not bought. */
  const subscribed = Boolean(user?.stripeSubscriptionId);
  const selling = sellingEnabled();
  const price = !onPlus && !subscribed && selling ? await plusPrice() : null;

  const interested =
    account && !onPlus && !selling
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

      {tack && onPlus && (
        <p className="plus-thanks" role="status">
          <strong>Tack! Nu har du Plus.</strong> De extra stilarna finns bland de andra i steg tre,
          och länken skapar du under Dela.
        </p>
      )}
      {tack && account && !onPlus && (
        // Paid, and Stripe has not confirmed it to us yet. Rare, and worth a
        // sentence: the alternative is a buyer looking at a buy button.
        <p className="plus-thanks" role="status">
          <strong>Tack!</strong> Plus slås på så fort betalningen är bekräftad. Det brukar ta
          mindre än en minut. Ladda om sidan om en stund.
        </p>
      )}

      {onPlus && !tack && !subscribed && (
        <p className="plus-thanks" role="status">
          <strong>Du har Plus.</strong> De extra stilarna finns bland de andra i steg tre, och länken
          skapar du under Dela.
        </p>
      )}

      {onPlus && subscribed && user && (
        <section>
          <h2>Ditt abonnemang</h2>
          {cancellationPending(user.stripeCancelAt) ? (
            <p>
              Abonnemanget är uppsagt. Du har Plus till och med{" "}
              <strong>{day.format(user.stripeCancelAt!)}</strong>, och sedan dras inget mer.
            </p>
          ) : user.stripeSubscriptionStatus === "past_due" ? (
            <p>
              <strong>Den senaste betalningen gick inte igenom.</strong> Du har Plus kvar medan vi
              försöker igen. Byt kort under Hantera abonnemang, annars avslutas Plus.
            </p>
          ) : (
            <p>
              Du har Plus.
              {user.stripeCurrentPeriodEnd && (
                <>
                  {" "}
                  Abonnemanget förnyas <strong>{day.format(user.stripeCurrentPeriodEnd)}</strong>.
                </>
              )}
            </p>
          )}
          <p className="hint">
            Säga upp, byta kort och hämta kvitton gör du hos Stripe, som sköter betalningen.
          </p>
          <PlusBilling mode="portal" label="Hantera abonnemang" quiet />
        </section>
      )}

      {!onPlus && subscribed && (
        <section>
          <h2>Ditt abonnemang</h2>
          <p>
            <strong>Abonnemanget är inte betalt, så Plus är avstängt.</strong> Under Hantera
            abonnemang kan du betala det eller avsluta det.
          </p>
          <PlusBilling mode="portal" label="Hantera abonnemang" />
        </section>
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
            <span className="plus-tag now">Finns nu</span>
            <strong>En länk som alltid visar senaste versionen.</strong> Byter en lektion sal
            ändrar du det en gång, och alla som har länken ser det nya schemat. Ingen behöver få
            en ny länk. Du skapar den under Dela i steg tre.
          </li>
          <li>
            <span className="plus-tag">Kommer</span>
            <strong>Skicka ut schemat.</strong> Spara en lista med mejladresser, till exempel
            klassens föräldrar, och skicka schemat till alla på en gång.
          </li>
        </ul>
      </section>

      {!onPlus && !subscribed && selling && price && (
        <section>
          <h2>Vad kostar det?</h2>
          <p>
            <strong>{priceInWords(price)}</strong>
            {price.taxIncluded ? ", inklusive moms" : ""}. Du betalar för det som finns nu; det som
            är märkt Kommer ingår när det är klart.
          </p>
          <p>
            Abonnemanget förnyas av sig självt tills du säger upp det. Det gör du själv här på
            sidan, när du vill, och du har då Plus kvar den tid du har betalat för.
          </p>
          {account ? (
            <PlusBilling mode="checkout" label="Skaffa Plus" />
          ) : (
            <p className="plus-ask">
              <Link href="/login?next=plus" className="btn primary">
                Logga in och skaffa Plus
              </Link>
              <span className="hint">Plus hör till ett konto, så du behöver logga in först.</span>
            </p>
          )}
          <p className="hint">
            Du betalar med kort hos Stripe. Vi ser aldrig ditt kortnummer. Du har 14 dagars
            ångerrätt: mejla <a href={`mailto:${CONTACT}`}>{CONTACT}</a> så betalar vi tillbaka.
          </p>
        </section>
      )}

      {!onPlus && !subscribed && selling && !price && (
        // For sale, but Stripe could not be asked what it costs. No price, no
        // buy button: nobody should be sent to pay a sum this page cannot name.
        <section>
          <h2>Vad kostar det?</h2>
          <p>Det går inte att köpa Plus just nu. Försök igen om en stund.</p>
        </section>
      )}

      {!onPlus && !selling && (
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
