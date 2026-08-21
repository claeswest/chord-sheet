import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/data/landingPages";

// Only pages worth landing on. Not /recipes or /admin, which need a session,
// and not /share/[token], which are private links belonging to whoever made
// them — publishing those in a sitemap would hand out other people's recipes.

const BASE_URL = "https://recipebookmaker.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...LANDING_PAGES.map((p) => ({
      url: `${BASE_URL}/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
