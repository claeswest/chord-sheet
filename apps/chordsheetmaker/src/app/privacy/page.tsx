import type { Metadata } from "next";
import { LegalEmail, LegalLink, LegalPage, LegalSection } from "@/components/landing/Legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ChordSheetMaker stores about you, why, who else handles it, and how to have it deleted.",
};

// This page describes what the code does, so it goes out of date when the code
// changes. Look at it again when you: add a field to User or to the activity
// log (lib/activity.ts), add a sign-in method (lib/auth.ts), send content to a
// new service (app/api/ai/*), add an email (lib/marketing*.ts), or load a new
// script for every visitor (components/analytics). Change UPDATED with the text.
const UPDATED = "November 17, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated={UPDATED}
      lead="What ChordSheetMaker stores about you, why, which other companies handle it, and how to have it deleted."
      other={{ href: "/terms", label: "Terms of Service" }}
    >
      <LegalSection title="1. Who is responsible">
        <p>
          HB Clavos, Sweden, runs ChordSheetMaker and is responsible for the personal data
          described here. For anything on this page, email <LegalEmail />.
        </p>
      </LegalSection>

      <LegalSection title="2. What we store">
        <ul>
          <li>
            <strong>Your account.</strong> Your email address, and the name and profile picture
            your sign-in service gives us, if any. We also keep which sign-in method you used.
          </li>
          <li>
            <strong>Your songs and setlists.</strong> The lyrics, chords, styling and background
            pictures of the charts you save, and how you have sorted them.
          </li>
          <li>
            <strong>Share links.</strong> When you make a share link we store a copy of that
            song, as it was at that moment, for anyone with the link to open.
          </li>
          <li>
            <strong>Your plan.</strong> Which plan you are on, whether it is in trial, active or
            cancelled, when the current period ends, and Stripe&apos;s reference numbers for you and
            your subscription. We never receive or store your card details.
          </li>
          <li>
            <strong>An activity log.</strong> One line when certain things happen: an account is
            created, you sign in, you create, open or edit a song, import one, export a PDF,
            make a share link, use an AI feature, or a subscription starts, changes or ends. A
            line has the time, sometimes the song&apos;s title, and for things you did yourself the
            country you were in, as two letters. Our hosting provider works the country out
            from your internet address; we do not store the address itself.
          </li>
          <li>
            <strong>Emails we have sent you</strong>, and whether you have unsubscribed.
          </li>
          <li>
            <strong>Error reports.</strong> If the app fails in your browser it sends us the
            error message, the page it happened on and the type of browser.
          </li>
        </ul>
        <p>
          <strong>Without an account</strong> your songs stay in your own browser and are not
          sent to us for storage. A random number kept in your browser lets the activity log
          tell one visitor from another without knowing who anyone is.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we store it">
        <ul>
          <li>
            <strong>To provide the service you asked for:</strong> your account, your songs,
            your share links, your plan and its billing.
          </li>
          <li>
            <strong>To understand how the app is used and to fix it:</strong> the activity log
            and the error reports. This is our legitimate interest in running and improving
            the service.
          </li>
          <li>
            <strong>To write to you about the service:</strong> the sign-in link you ask for, and
            a small number of emails about getting started and about paid plans to people who
            have an account. Every such email has an unsubscribe link that works without
            signing in.
          </li>
          <li>
            <strong>To meet legal duties,</strong> such as bookkeeping of payments.
          </li>
        </ul>
        <p>We do not sell personal data, and we do not use your songs for advertising.</p>
      </LegalSection>

      <LegalSection title="4. Who else handles it">
        <p>These companies process data for us, each for one job:</p>
        <ul>
          <li><strong>Vercel</strong> hosts the site. Like any web host it sees the internet address of each request.</li>
          <li><strong>Neon</strong> hosts the database where accounts, songs and the activity log are stored.</li>
          <li><strong>Stripe</strong> takes payments and holds the card details.</li>
          <li><strong>Resend</strong> delivers our emails, including sign-in links.</li>
          <li>
            <strong>Google</strong> runs the AI features. What you hand to one of them is sent
            to Google&apos;s Gemini service for that request: the title you search for, the text you
            paste, the photo you take, the chart you ask it to style, or the description of the
            background you want.
          </li>
          <li>
            <strong>Google, GitHub or Apple</strong> signs you in, if that is the method you
            choose. They learn that you signed in to ChordSheetMaker; we receive your email
            address, name and picture from them.
          </li>
          <li><strong>Google</strong> also measures visits to the site. That is section 5.</li>
        </ul>
        <p>
          Several of these are American companies, so data can be processed outside the EU.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies and measurement">
        <ul>
          <li>
            <strong>A sign-in cookie</strong> keeps you signed in. The app cannot work without it.
          </li>
          <li>
            <strong>Storage in your browser</strong> holds your songs if you have no account,
            a few settings, and the random visitor number mentioned in section 2.
          </li>
          <li>
            <strong>Google Analytics and the Google Ads tag</strong> count visits and show us
            whether an advertisement led to someone signing up. They set cookies and tell
            Google that your browser visited the site. They are loaded for every visitor. You
            can block them in your browser&apos;s settings or with a content blocker, and the app
            works the same without them.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <ul>
          <li>
            <strong>Your account, songs and setlists</strong> are kept until you delete them or
            ask us to delete the account.
          </li>
          <li>
            <strong>When an account is deleted,</strong> the account, its sign-in connections,
            its songs and its setlists are removed. Its lines in the activity log remain for
            our statistics but no longer point to the account.
          </li>
          <li>
            <strong>Share links</strong> are separate copies and stay up until you ask us to
            remove them.
          </li>
          <li>
            <strong>Payment records</strong> are kept for as long as Swedish bookkeeping law
            requires.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          You can ask us for a copy of the personal data we hold about you, to correct it, to
          delete it, to hand it over in a form you can take elsewhere, or to stop a particular
          use of it. There is no delete button in the app yet: email <LegalEmail /> from the
          address of your account and we will delete the account and everything in it, and
          answer any other request, within 30 days.
        </p>
        <p>
          If you think we handle your data wrongly, tell us first if you can. You also have the
          right to complain to the Swedish Authority for Privacy Protection
          (Integritetsskyddsmyndigheten, <LegalLink href="https://www.imy.se">imy.se</LegalLink>) or
          to the data protection authority where you live.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this page">
        <p>
          When what we store or who handles it changes, we update this page and the date at
          the top.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
