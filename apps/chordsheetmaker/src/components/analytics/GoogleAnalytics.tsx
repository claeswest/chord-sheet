import Script from "next/script";
import { Suspense } from "react";
import PageViews from "./PageViews";
import { ADS_ID } from "@/lib/analytics";

const AW_ID = ADS_ID; // single source of truth — lib/analytics sends conversions to it

/**
 * Google Analytics 4 + Google Ads tracking.
 *
 * GA4 setup:
 *   1. Create a GA4 property at analytics.google.com
 *   2. Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX to your Vercel env vars
 *
 * Ads conversions: loading this tag only reports page views. Reporting an
 * actual conversion is trackSignUp() in lib/analytics, which needs
 * NEXT_PUBLIC_ADS_SIGNUP_LABEL — see .env.example.
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      {/* Google Ads conversion tracking — always active */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${AW_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${AW_ID}');
        `}
      </Script>

      {/* GA4 — active only when NEXT_PUBLIC_GA_ID is set */}
      {gaId && (
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            gtag('config', '${gaId}', { send_page_view: true });
          `}
        </Script>
      )}

      {/* Suspense is required, not decorative: useSearchParams on a
          prerendered route fails the production build without a boundary. */}
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
