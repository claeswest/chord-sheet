"use client";

// Sends a page_view when the route changes.
//
// Without this, Google sees exactly one page per visit: gtag('config') fires a
// page_view on the first real page load, and every navigation after that is a
// client-side transition that loads nothing. Two consequences, both real:
//
//  - GA4 recorded only the page each visit *started* on. Every session looked
//    like a single-page visit, so no in-app path could be measured.
//  - The Ads conversion "page load whose URL contains welcome=1" could never
//    fire, because the CTA that produces that URL is a <Link>. It read zero
//    against 114 ad clicks, which looked like nobody clicking and was in fact
//    nobody watching.
//
// The event goes to every configured tag, GA4 and Ads alike, which is what
// makes that conversion action work again. It is Secondary now, so it counts
// as an observation rather than something to bid on — which is exactly what a
// mid-funnel step should be.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // gtag('config') already sent one for this page. Sending our own on mount
  // would double-count every landing.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const qs = searchParams.toString();
    try {
      window.gtag?.("event", "page_view", {
        page_path: qs ? `${pathname}?${qs}` : pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    } catch {
      /* never let analytics break a navigation */
    }
  }, [pathname, searchParams]);

  return null;
}
