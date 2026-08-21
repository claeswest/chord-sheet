import type { MetadataRoute } from "next";

// Share links are the reason this file exists rather than a two-line
// robots.txt. A shared recipe is reachable by anyone with the token, but it is
// not published — indexing one would put somebody's recipe in a search result
// they never agreed to. Same for anything behind a session.

const BASE_URL = "https://recipebookmaker.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/recipes", "/share/", "/unsubscribe"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
