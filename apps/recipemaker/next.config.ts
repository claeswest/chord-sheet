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
  // `next build` and `next dev` share .next by default, so building while the
  // dev server is running corrupts it — the symptom is every route suddenly
  // 500ing or 404ing, which looks nothing like the cause. The root build script
  // sets NEXT_DIST_DIR so the two never collide. Vercel doesn't set it and gets
  // the default.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // @clavos/core exports TypeScript source rather than a build artefact, so
  // Next compiles it as part of this app.
  transpilePackages: ["@clavos/core"],
  experimental: {
    // Recipe photos are uploaded as base64 blobs.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // The social card reads its fonts from disk at request time, and the path is
  // built at runtime — nothing the tracer can follow. Without this the files
  // are simply absent in production, and the only symptom is a share card
  // rendered in the wrong typeface, which no build or test would catch.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/**/*"],
  },

  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
