import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Resolve the current commit at build time (Vercel sets VERCEL_GIT_COMMIT_SHA;
// otherwise fall back to local git, then "dev").
function commitSha(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  // @clavos/core exports TypeScript source rather than a build artefact, so
  // Next compiles it as part of this app. No separate build step to keep in
  // sync, and editing the package hot-reloads here.
  transpilePackages: ["@clavos/core"],
  experimental: {
    // Background images are base64 blobs — increase body size limit to 10 MB
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Build metadata, inlined into the bundle so the app can show what's deployed.
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // /tour → the static system-tour deck. A redirect rather than a rewrite: the
  // deck references its images relatively so it also works opened as a local
  // file, and at a bare "/tour" those paths would resolve against the site root.
  async redirects() {
    return [{ source: "/tour", destination: "/tour/index.html", permanent: false }];
  },
};

export default nextConfig;
