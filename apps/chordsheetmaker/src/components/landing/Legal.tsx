// The frame the terms and the privacy page share: wordmark, a dated heading,
// one white sheet of numbered sections, and a way to the other page.

import Link from "next/link";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Eyebrow, Wordmark } from "@/components/landing/kit";

/** Where questions about either page go. The same address as the site's Contact link. */
export const LEGAL_EMAIL = "claes@clavos.se";

const LINK = "text-chord underline underline-offset-2 decoration-chord/30 hover:text-ink hover:decoration-ink/40 transition-colors";

export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith("/")
    ? <Link href={href} className={LINK}>{children}</Link>
    : <a href={href} className={LINK}>{children}</a>;
}

export function LegalEmail() {
  return <LegalLink href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</LegalLink>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9 last:mb-0">
      <h2 className="font-display font-medium text-[22px] leading-snug tracking-[-0.01em] text-ink mb-2.5">{title}</h2>
      <div className="text-[15px] text-stone-600 leading-relaxed space-y-3 [&_strong]:font-semibold [&_strong]:text-stone-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function LegalPage({
  title,
  updated,
  lead,
  other,
  children,
}: {
  title: string;
  /** The date the text last changed, written out. Change it with the text. */
  updated: string;
  /** One or two sentences under the heading: what this page is. */
  lead: React.ReactNode;
  /** The companion page, linked at the foot. */
  other: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className={`${LANDING_FONTS} min-h-screen bg-paper text-ink`}>
      <header className="px-5 sm:px-8 py-4 border-b border-rule">
        <div className="max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home"><Wordmark className="text-[1.15rem] sm:text-2xl" /></Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-10 sm:pt-14">
        <Eyebrow className="mb-4">Last updated {updated}</Eyebrow>
        <h1 className="font-display font-medium text-[2.6rem] sm:text-6xl leading-[1.05] tracking-[-0.02em] text-ink">
          {title}
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">{lead}</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 sm:py-12">
        <div className="bg-white rounded-xl border border-rule p-6 sm:p-10">
          {children}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="text-stone-600 hover:text-ink transition-colors">← Back to ChordSheetMaker</Link>
          <Link href={other.href} className="font-semibold text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink transition-colors">
            {other.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
