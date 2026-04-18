import Script from "next/script";

/**
 * Google Analytics 4 — loaded only when NEXT_PUBLIC_GA_ID is set.
 *
 * Setup:
 *   1. Create a GA4 property at analytics.google.com
 *   2. Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX to your Vercel env vars
 *   3. For Google Ads conversion tracking, link your GA4 property to your
 *      Google Ads account and import Goals as conversions.
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
