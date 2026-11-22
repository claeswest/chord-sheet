import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// The privacy page. It describes what the code does, so it goes out of date
// when the code changes. Look at it again when you:
//
// - send a schedule or a photo anywhere new, or keep one anywhere new
//   (app/api/read, app/api/pdf, lib/share.ts, lib/scheduleDb.ts)
// - add a column to User or Account, or a sign-in method (prisma/schema.prisma,
//   lib/auth.ts) — the list of what an account holds is spelled out below
// - log anything new, or put more than counts in the activity log
//   (lib/activity.ts and every logActivity call)
// - load a script for every visitor: there is none today, and section 6 says so
// - move the database or the hosting: section 7 says both are in Frankfurt,
//   which for the server is the one line in apps/schedulemaker/vercel.json
// - turn PRINT_ON_SERVER off in components/SchedulerApp.tsx: section 3 is only true while it is on
//
// Every sentence here was checked against the code on the date below. Change
// UPDATED with the text.
//
// Written as one parent to another, like the rest of the app. It is not a
// lawyer's document and does not try to sound like one; what it must be is
// true and complete.

const UPDATED = "22 november 2026";

/** The same public address the owner's other sites give for privacy questions. */
const CONTACT = "claes@clavos.se";

export const metadata: Metadata = {
  title: "Integritet – Fixa schemat",
  description:
    "Vad Fixa schemat gör med ert schema: vad som stannar i webbläsaren, vad som skickas, vad som sparas om du skapar ett konto, och hur du tar bort det.",
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <SiteHeader current="start" />

      <h1>Integritet</h1>
      <p className="legal-updated">Senast ändrad {UPDATED}</p>

      <p className="legal-lead">
        Ett skolschema säger vad ett barn heter, vilken klass det går i och var det är varje timme.
        Därför är appen byggd så att vi har så lite av det som möjligt. Här står vad som händer med
        ert schema, steg för steg.
      </p>

      <section>
        <h2>Kort sagt</h2>
        <ul>
          <li>Du behöver inget konto. Utan konto sparar vi ingenting om er.</li>
          <li>
            Schemat ligger i din egen webbläsare. Det skickas till oss bara när du ber om något som
            kräver det: att läsa av en bild, eller att skapa en PDF.
          </li>
          <li>
            Skapar du ett konto och trycker på Spara lagras schemat hos oss tills du tar bort det.
            Du kan ta bort hela kontot själv, när du vill.
          </li>
          <li>Vi har ingen reklam och ingen besöksmätning, och säljer inga uppgifter.</li>
        </ul>
      </section>

      <section>
        <h2>1. Vem som ansvarar</h2>
        <p>
          HB Clavos, Sverige, driver Fixa schemat och ansvarar för de personuppgifter som beskrivs
          här. Frågor om något på den här sidan: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>

      <section>
        <h2>2. När du läser av ett schema</h2>
        <p>
          Bilden eller texten du laddar upp skickas till vår server och vidare till Googles
          AI-tjänst Gemini, som läser av den och skickar tillbaka schemat. Vi sparar varken bilden,
          texten eller det avlästa schemat. Vi använder Googles betaltjänst, där Google enligt sina
          villkor inte använder innehållet för att förbättra sina produkter.
        </p>
        <p>
          Det avlästa schemat sparas i din webbläsare, så att det finns kvar om du laddar om sidan.
          Det ligger på din enhet och ingen annanstans. Rensar du webbläsarens data försvinner det.
          Originalbilden visas bredvid schemat medan du redigerar, men den sparas inte ens i
          webbläsaren.
        </p>
        <p>
          För att ingen ska kunna överbelasta tjänsten räknar servern hur många avläsningar och
          PDF:er som kommer från samma internetadress under en kvart. Den räkningen ligger bara i
          serverns minne och sparas inte.
        </p>
      </section>

      <section>
        <h2>3. När du skapar en PDF</h2>
        <p>
          När du trycker på Skapa PDF skickas schemat till vår server, som gör filen och skickar
          tillbaka den. Schemat finns där i några sekunder medan filen görs. Det sparas inte och
          skrivs inte i någon logg.
        </p>
        <p>
          Skriv ut fungerar annorlunda: det sköter din egen webbläsare, och då skickas ingenting.
        </p>
      </section>

      <section>
        <h2>4. När du delar med klassen</h2>
        <p>
          Länken du får innehåller själva schemat: klass, skola, dagar, tider, ämnen, lärare, salar
          och anteckningar. Rubriken, till exempel ”Annas schema”, följer inte med. Schemat ligger
          i länken och skickas aldrig till oss.
        </p>
        <p>
          Alla som får länken kan läsa schemat, och den tjänst du skickar länken genom ser den
          också. Skicka den bara dit den ska.
        </p>
      </section>

      <section>
        <h2>5. Om du skapar ett konto</h2>
        <p>Ett konto är frivilligt. Har du ett sparar vi det här:</p>
        <ul>
          <li>
            <strong>Kontot.</strong> Din e-postadress, och det namn och den profilbild som Google
            lämnar när du loggar in. Vi sparar också att du loggade in med Google och de uppgifter
            Google skickar för att visa att inloggningen är giltig. Vi får aldrig ditt lösenord.
          </li>
          <li>
            <strong>De scheman du sparar.</strong> Hela schemat som det ser ut när du trycker på
            Spara: rubrik, klass, skola, dagar, tider, ämnen, lärare, salar, anteckningar, de namn
            och färger du har valt, och stilen. Står ett barns namn i rubriken sparas det också.
          </li>
          <li>
            <strong>Att du är inloggad.</strong> En rad som säger att din webbläsare är inloggad.
            Den gäller i högst 30 dagar åt gången.
          </li>
          <li>
            <strong>En räkning av vad som händer.</strong> En rad när ett konto skapas, när du
            loggar in och när ett schema sparas, kopieras eller tas bort. Raden har tidpunkten och
            ibland hur många lektioner schemat hade. Den innehåller aldrig något av det som står
            på schemat.
          </li>
        </ul>
        <p>
          Vi sparar det för att du ska kunna hitta dina scheman igen, och räkningen för att vi ska
          kunna se om tjänsten används. Vi använder inte uppgifterna till något annat, och vi
          skickar ingen reklam.
        </p>
        <p>
          <strong>Så tar du bort det.</strong> Under Mina scheman kan du ta bort ett schema i taget,
          eller trycka på Ta bort mitt konto. Då försvinner kontot, alla sparade scheman och
          inloggningen direkt. Räkningen blir kvar, men utan koppling till dig. Ett schema som du
          inte tar bort ligger kvar tills du gör det.
        </p>
      </section>

      <section>
        <h2>6. Kakor och mätning</h2>
        <p>
          Utan konto sätter vi inga kakor alls. Loggar du in sätts en kaka som håller dig inloggad,
          och ett par kortlivade kakor under själva inloggningen. De behövs för att inloggningen
          ska fungera och används inte till något annat.
        </p>
        <p>
          Vi har ingen besöksstatistik, inga annonser och inga spårningsskript från andra företag.
        </p>
      </section>

      <section>
        <h2>7. Vilka som hjälper oss</h2>
        <p>De här företagen behandlar uppgifter åt oss, var och en för en sak:</p>
        <ul>
          <li>
            <strong>Vercel</strong> driver webbplatsen och servern. Servern står i Frankfurt. Som
            alla webbhotell ser de internetadressen för varje anrop.
          </li>
          <li>
            <strong>Neon</strong> driver databasen där konton, sparade scheman och räkningen
            ligger. Databasen finns i Frankfurt.
          </li>
          <li>
            <strong>Google</strong> läser av bilder och text med Gemini, och loggar in dig om du
            skapar ett konto. Då får Google veta att du loggade in på Fixa schemat.
          </li>
        </ul>
        <p>
          Servern och databasen står alltså i Frankfurt. Var Google läser av en bild styr vi inte
          över, och alla tre är amerikanska företag, så uppgifter kan ändå behandlas utanför EU.
        </p>
      </section>

      <section>
        <h2>8. Dina rättigheter</h2>
        <p>
          Du kan be oss om en kopia av det vi har sparat om dig, be oss rätta det eller ta bort
          det. Mejla <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Det mesta kan du göra själv under
          Mina scheman.
        </p>
        <p>
          Är du inte nöjd med hur vi hanterar dina uppgifter kan du klaga hos
          Integritetsskyddsmyndigheten, <a href="https://www.imy.se">imy.se</a>.
        </p>
      </section>

      <section>
        <h2>9. Om något ändras</h2>
        <p>
          När det vi sparar eller vilka som hjälper oss ändras, ändrar vi den här sidan och datumet
          överst.
        </p>
      </section>

      <p className="legal-back">
        <Link href="/">← Till startsidan</Link>
      </p>
    </main>
  );
}
