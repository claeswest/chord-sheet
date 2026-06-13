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
};

export default nextConfig;
