import Script from "next/script";

const AW_ID = "AW-1064389018"; // Google Ads conversion tracking

/**
 * Google Analytics 4 + Google Ads tracking.
 *
 * GA4 setup:
 *   1. Create a GA4 property at analytics.google.com
 *   2. Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX to your Vercel env vars
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
    </>
  );
}
