import type { NextConfig } from "next";

// No database, no auth, no billing — so almost none of the other apps'
// configuration applies. What it does need is the shared package compiled as
// part of this app, since @clavos/core ships TypeScript source rather than a
// build artefact.
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@clavos/core"],
  experimental: {
    // A photographed timetable arrives as a base64 data URL.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
