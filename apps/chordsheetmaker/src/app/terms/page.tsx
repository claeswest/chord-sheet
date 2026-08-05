import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for ChordSheetMaker — plain-language rules for using the app.",
};

const UPDATED = "July 3, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-zinc-900 mb-2">{title}</h2>
      <div className="text-sm text-zinc-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "#f0f0f5" }}>
      {/* Header */}
      <div
        className="py-10 sm:py-14 text-center px-6"
        style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
      >
        <Link href="/" className="text-sm font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-nunito)" }}>
          ChordSheet<span className="text-indigo-400">Maker</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4 mb-2">
          Terms of Service
        </h1>
        <p className="text-zinc-400 text-sm">Last updated {UPDATED}</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 sm:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-10">
          <Section title="1. Who we are">
            <p>
              ChordSheetMaker (chordsheetmaker.ai) is a web app for creating, styling and
              performing chord sheets, operated by HB Clavos, Sweden. Questions? Email{" "}
              <a href="mailto:claes@clavos.se" className="text-indigo-600 hover:text-indigo-700">claes@clavos.se</a>.
            </p>
          </Section>

          <Section title="2. Your account">
            <p>
              You can use ChordSheetMaker without an account (songs are then stored only on
              your device). Creating an account — via Google, GitHub, Apple or an email
              sign-in link — stores your songs with your account so they're available on all
              your devices. You're responsible for keeping access to your sign-in method secure.
            </p>
          </Section>

          <Section title="3. Plans, trials and billing">
            <p>
              The Free plan is free forever, with limited features. Paid plans (Monthly,
              Yearly) unlock more and start with a <strong>7-day free trial</strong> — you can
              cancel any time during the trial and pay nothing. After the trial, your plan
              renews automatically until you cancel. Payments are processed by Stripe; we never
              see or store your card details.
            </p>
            <p>
              You can cancel from your account page at any time; your plan then runs until the
              end of the period you've paid for. By starting a paid plan you consent to the
              service beginning immediately, which may affect statutory withdrawal rights for
              digital services in the EU. If something went wrong with a charge, email us —
              we're reasonable people.
            </p>
          </Section>

          <Section title="4. Your content">
            <p>
              Your songs are yours. We claim no ownership of the lyrics, chords, styles or
              images in your charts, and we don't share them with anyone. Our staff may view
              your content only to provide support or keep the service working.
            </p>
            <p>
              You're responsible for what you create: if you make chord sheets of copyrighted
              songs, make sure your use is permitted where you live (personal/performance use
              is typically the user's own responsibility). Don't use the service to store or
              share unlawful content.
            </p>
          </Section>

          <Section title="5. AI features">
            <p>
              Song search, import cleanup and image generation use AI and can be wrong,
              incomplete or occasionally unavailable. Always check the result — chords in
              particular may need a human ear.
            </p>
          </Section>

          <Section title="6. The service">
            <p>
              We work hard to keep ChordSheetMaker fast and available, but it's provided
              &quot;as is&quot; without warranties; we may change or improve features over time.
              To the extent permitted by law, our liability is limited to the amount you've
              paid us in the last 12 months. We may suspend accounts that abuse the service.
            </p>
          </Section>

          <Section title="7. Changes to these terms">
            <p>
              If we make material changes we'll update this page and the date above. Continuing
              to use the service after a change means you accept the new terms. Swedish law
              applies.
            </p>
          </Section>

          <div className="pt-4 border-t border-zinc-100 text-center">
            <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to ChordSheetMaker
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
