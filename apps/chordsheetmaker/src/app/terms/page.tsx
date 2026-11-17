import type { Metadata } from "next";
import { LegalEmail, LegalLink, LegalPage, LegalSection } from "@/components/landing/Legal";
import { featureLimit, getSongLimit } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for ChordSheetMaker — plain-language rules for using the app.",
};

// Change this with the text. What the app does with personal data is on
// /privacy; when a feature starts sending content somewhere new, both pages
// need a look (section 4 here, section 4 there).
const UPDATED = "November 17, 2026";

/** "2 songs", "1 song". */
const songs = (n: number | null) => `${n} ${n === 1 ? "song" : "songs"}`;

export default function TermsPage() {
  const freeSongs = getSongLimit("free");
  const freePdf = featureLimit("free", "pdfExport");
  const freeShares = featureLimit("free", "sharing");

  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      lead="The rules for using ChordSheetMaker, in plain language. What we do with your personal data is on a page of its own."
      other={{ href: "/privacy", label: "Privacy" }}
    >
      <LegalSection title="1. Who we are">
        <p>
          ChordSheetMaker (chordsheetmaker.ai) is a web app for creating, styling and
          performing chord sheets, operated by HB Clavos, Sweden. Questions? Email <LegalEmail />.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You can use ChordSheetMaker without an account (songs are then stored only on
          your device). Creating an account — via Google, GitHub, Apple or an email
          sign-in link — stores your songs with your account so they&apos;re available on all
          your devices. You&apos;re responsible for keeping access to your sign-in method secure.
        </p>
      </LegalSection>

      <LegalSection title="3. Plans, trials and billing">
        <p>
          The Free plan is free for as long as you like
          {freeSongs !== null && <>, with room for {songs(freeSongs)}</>}
          {freePdf !== null && freeShares !== null && (
            <>, PDF export for {songs(freePdf)} and share links for {songs(freeShares)}</>
          )}
          . Paid plans (Monthly, Yearly) remove those limits.
        </p>
        <p>
          A paid plan starts with a <strong>7-day free trial</strong>, and starting the trial
          needs a payment card. <strong>If you don&apos;t cancel before the 7 days are up, the card
          is charged when the trial ends</strong>, at the price shown at checkout, and then again
          every month or every year until you cancel. Cancel at any time during the trial
          and you pay nothing.
        </p>
        <p>
          You cancel from your account page. A plan you have paid for then runs until the end
          of the period you&apos;ve paid for, and is not renewed. Payments are processed by Stripe;
          we never see or store your card details.
        </p>
        <p>
          By starting a paid plan you consent to the service beginning immediately, which may
          affect statutory withdrawal rights for digital services in the EU. If something
          went wrong with a charge, email us — we&apos;re reasonable people.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          Your songs are yours. We claim no ownership of the lyrics, chords, styles or
          images in your charts. We don&apos;t sell them and we don&apos;t show them to other users.
          Your content leaves your account only in these cases:
        </p>
        <ul>
          <li>
            <strong>Share links you create.</strong> Anyone who has the link can open that
            song, without an account. Send it only to people you want to have it.
          </li>
          <li>
            <strong>AI features you use.</strong> What you hand to one of them — a song title,
            pasted text, a photo, the chart to be styled — is sent to Google&apos;s AI service to
            produce the result.
          </li>
          <li>
            <strong>The companies that run the service for us</strong>, such as hosting and the
            database, store it on our behalf.
          </li>
          <li>
            <strong>Support.</strong> Our staff may look at your content only to help you or to
            keep the service working.
          </li>
        </ul>
        <p>
          The <LegalLink href="/privacy">privacy page</LegalLink> names those companies and says
          what else we store.
        </p>
        <p>
          You&apos;re responsible for what you create and share. The lyrics and chords of
          published songs are usually protected by copyright: make sure your use is permitted
          where you live, and take particular care before sending a share link or a PDF to
          others. Don&apos;t use the service to store or share unlawful content. If you believe
          something shared through ChordSheetMaker infringes your rights, email <LegalEmail /> and
          we&apos;ll deal with it promptly.
        </p>
      </LegalSection>

      <LegalSection title="5. AI features">
        <p>
          Finding a song&apos;s chords, tidying pasted text, reading a photo, styling a chart and
          generating a background picture all use AI. The results can be wrong or incomplete,
          and the features can occasionally be unavailable. Treat what the AI gives you as a
          starting point and check it — chords in particular may need a human ear.
        </p>
      </LegalSection>

      <LegalSection title="6. The service">
        <p>
          We work hard to keep ChordSheetMaker fast and available, but it&apos;s provided
          &quot;as is&quot; without warranties; we may change or improve features over time.
          To the extent permitted by law, our liability is limited to the amount you&apos;ve
          paid us in the last 12 months. We may suspend accounts that abuse the service.
        </p>
        <p>
          Nothing in these terms takes away rights you have as a consumer under laws that
          cannot be set aside by agreement.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to these terms">
        <p>
          If we make material changes we&apos;ll update this page and the date above. Continuing
          to use the service after a change means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing law">
        <p>
          Swedish law applies to these terms. If you use ChordSheetMaker as a consumer, you
          also keep the protection of the mandatory consumer rules of the country you live in.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
