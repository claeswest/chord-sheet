"use client";

// The strip across the top of every page: the way home, and the two or three
// places there are to go.
//
// It exists because there was no way home. The editor had no logo; the start
// page could only be reached from it through "Börja om", which throws the
// schedule away; and the one link to an account was a small grey word in a
// corner. Three links do not need a menu that folds out, so this is a row.
//
// What it shows depends on two things only the browser knows: whether there
// is a schedule being worked on (it lives in this browser's storage), and
// whether anyone is signed in. A page that already knows either passes it in;
// a page that does not — the server-rendered ones — lets this find out.

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoMark, SITE_NAME } from "@/components/Logo";
import { SHEET_STORE } from "@/lib/sheetState";

export type Account = { enabled: boolean; email: string | null };

export default function SiteHeader({
  current,
  account: given,
  hasSchedule: givenSchedule,
}: {
  /** Which page this is, so it does not offer a link to itself. */
  current: "start" | "editor" | "saved" | "other";
  /** Who is signed in, where the page already asked. Null means "asked, not answered yet". */
  account?: Account | null;
  /** Whether a schedule is open in this browser, where the page already knows. */
  hasSchedule?: boolean;
}) {
  const [found, setFound] = useState<Account | null>(null);
  const [stored, setStored] = useState(false);

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

  useEffect(() => {
    if (givenSchedule !== undefined) return;
    try {
      const raw = localStorage.getItem(SHEET_STORE);
      setStored(Boolean(raw && JSON.parse(raw)?.schedule));
    } catch {
      setStored(false);
    }
  }, [givenSchedule]);

  const account = given !== undefined ? given : found;
  const hasSchedule = givenSchedule !== undefined ? givenSchedule : stored;

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
        {current !== "editor" && hasSchedule && <Link href="/schema">Mitt schema</Link>}
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
