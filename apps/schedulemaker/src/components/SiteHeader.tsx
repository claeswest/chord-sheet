"use client";

// The strip across the top of every page: the way home, and the one or two
// places there are to go.
//
// It exists because there was no way home. The editor had no logo; the start
// page could only be reached from it through "Börja om", which throws the
// schedule away; and the one link to an account was a small grey word in a
// corner. Two links do not need a menu that folds out, so this is a row.
//
// There is deliberately no link here to "the schedule that is open". There
// was, twice in one day: as "Mitt schema", which beside "Mina scheman" raised
// the question it should have answered, and then by the schedule's own name.
// The owner's point was simpler than either: a schedule is opened from "Mina
// scheman". For someone with no account, whose one schedule lives in this
// browser, the start page says which schedule is open and has the button to
// it — and the logo here is one press from that.

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoMark, SITE_NAME } from "@/components/Logo";

export type Account = { enabled: boolean; email: string | null };

/** What a schedule is called where it is named: its banner, else its class. */
export function scheduleName(s: { heading?: string; title: string } | null | undefined): string {
  return s ? s.heading?.trim() || s.title.trim() : "";
}

export default function SiteHeader({
  current,
  account: given,
}: {
  /** Which page this is, so it does not offer a link to itself. */
  current: "start" | "editor" | "saved" | "other";
  /** Who is signed in, where the page already asked. Null means "asked, not answered yet". */
  account?: Account | null;
}) {
  const [found, setFound] = useState<Account | null>(null);

  // A page that did not ask who is signed in — the server-rendered ones —
  // leaves it to this.
  useEffect(() => {
    if (given !== undefined) return;
    let live = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => live && setFound({ enabled: Boolean(d.enabled), email: d.user?.email ?? null }))
      .catch(() => live && setFound({ enabled: false, email: null }));
    return () => {
      live = false;
    };
  }, [given]);

  const account = given !== undefined ? given : found;

  return (
    <header className="site-header no-print">
      <Link href="/" className="site-home" aria-label={`${SITE_NAME} – till startsidan`}>
        <LogoMark size={28} />
        <span className="wordmark">{SITE_NAME}</span>
      </Link>

      <nav className="site-nav" aria-label="Sidor">
        {/* From the editor, the way to another schedule that does not cost
            this one: it stays where it is until something replaces it, and
            the start page asks before that happens. */}
        {current === "editor" && <Link href="/">Nytt schema</Link>}
        {account?.enabled && account.email && current !== "saved" && (
          <Link href="/scheman">Mina scheman</Link>
        )}
        {account?.enabled && !account.email && current !== "other" && (
          <Link href="/login" className="site-login">
            Logga in
          </Link>
        )}
      </nav>
    </header>
  );
}
