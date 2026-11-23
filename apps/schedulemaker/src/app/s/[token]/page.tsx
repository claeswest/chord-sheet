import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark, SITE_NAME } from "@/components/Logo";
import SharedView from "@/components/SharedView";
import { sheetBehind } from "@/lib/linkDb";
import { cleanState } from "@/lib/sheetState";

// /s/<token> — a link that always shows the latest saved version of one
// schedule. See lib/linkDb.ts for what that is and who may make one.
//
// The first page in this app that shows a stored schedule to someone who is
// not signed in. It shows the sheet and when it was last changed, and nothing
// about whose it is. A token that matches nothing — never made, turned off,
// or its schedule deleted — gets the same plain message, so the page does not
// say which.

export const metadata: Metadata = {
  title: "Schema – Fixa schemat",
  // Somebody's timetable, reachable only by having the link. Not for search
  // engines, and not for the previews that follow links found on a page.
  robots: { index: false, follow: false },
};

// The schedule may have been saved a second ago. Never built ahead, never cached.
export const dynamic = "force-dynamic";

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let found: Awaited<ReturnType<typeof sheetBehind>> = null;
  let failed = false;
  try {
    found = await sheetBehind(token);
  } catch (e) {
    // Next's own signals travel as errors with a digest; those are not ours.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(`[s] lookup failed: ${e instanceof Error ? e.message : String(e)}`);
    failed = true;
  }
  // Checked on the way out, like every other place a stored sheet is read.
  const state = found ? cleanState(found.state) : null;

  // Not being able to look is not the same as there being nothing: a parent
  // told "the link has been turned off" writes to the teacher for a new one,
  // and the teacher's link was fine all along.
  if (failed) {
    return (
      <main className="auth-page">
        <Link href="/" className="site-home" aria-label={`${SITE_NAME} – till startsidan`}>
          <LogoMark size={28} />
          <span className="wordmark">{SITE_NAME}</span>
        </Link>
        <h1>Schemat gick inte att hämta</h1>
        <p className="auth-lead">
          Något gick fel hos oss just nu. Länken är inte borta – ladda om sidan om en stund.
        </p>
      </main>
    );
  }

  if (!found || !state) {
    return (
      <main className="auth-page">
        <Link href="/" className="site-home" aria-label={`${SITE_NAME} – till startsidan`}>
          <LogoMark size={28} />
          <span className="wordmark">{SITE_NAME}</span>
        </Link>
        <h1>Här finns inget schema</h1>
        <p className="auth-lead">
          Länken visar inget schema längre. Den som skickade den kan ha stängt av den eller tagit
          bort schemat. Be om en ny länk.
        </p>
        <p className="hint auth-foot">
          Vill du göra ett eget schema? <Link href="/">Börja här</Link>
        </p>
      </main>
    );
  }

  return <SharedView state={state} updated={found.updatedAt.toISOString()} />;
}
