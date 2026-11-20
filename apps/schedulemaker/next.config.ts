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
  // "Skapa PDF" prints the sheet in a headless Chromium on the server (see
  // src/app/api/pdf/route.ts). The browser itself is four compressed files in
  // the package's bin folder, opened from disk when it starts — nothing imports
  // them, so nothing would know to put them in the function without this. The
  // symptom of leaving it out is a route that works on a laptop, which uses the
  // Chrome that is installed, and fails only once deployed.
  //
  // The path leaves the app because this is a workspace: packages are installed
  // at the repository root, two folders up.
  outputFileTracingIncludes: {
    "/api/pdf": ["../../node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
