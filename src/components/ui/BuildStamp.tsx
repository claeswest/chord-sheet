// Tiny "what's deployed" stamp: commit + build time, inlined at build time
// (see next.config.ts). Values are static strings, so this is hydration-safe
// and works in both server and client components.

const SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const ISO = process.env.NEXT_PUBLIC_BUILD_TIME || "";

// "2026-06-13T14:32:10.123Z" → "2026-06-13 14:32 UTC" (deterministic, no locale)
const WHEN = ISO ? `${ISO.slice(0, 10)} ${ISO.slice(11, 16)} UTC` : "local";

export default function BuildStamp({ className = "" }: { className?: string }) {
  return (
    <span className={className} title={`Commit ${SHA} · built ${WHEN}`}>
      v{SHA} · {WHEN}
    </span>
  );
}
