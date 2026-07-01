"use client";

// "What's deployed" stamp: commit + build time, inlined at build time (see
// next.config.ts). The commit + absolute UTC are static (hydration-safe); the
// "N minutes ago" is computed on the client after mount, so before hydration we
// render the absolute time and swap to relative once mounted — no mismatch.

import { useEffect, useState } from "react";

const SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const ISO = process.env.NEXT_PUBLIC_BUILD_TIME || "";

// "2026-06-13T14:32:10.123Z" → "2026-06-13 14:32 UTC" (deterministic, no locale)
const WHEN = ISO ? `${ISO.slice(0, 10)} ${ISO.slice(11, 16)} UTC` : "local";

function relativeTime(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default function BuildStamp({
  className = "",
  showAbsolute = false,
}: {
  className?: string;
  showAbsolute?: boolean;
}) {
  const [rel, setRel] = useState<string | null>(null);

  useEffect(() => {
    if (!ISO) return;
    const t = Date.parse(ISO);
    const tick = () => setRel(relativeTime(t, Date.now()));
    tick();
    const iv = setInterval(tick, 30_000); // keep "N minutes ago" fresh
    return () => clearInterval(iv);
  }, []);

  // Before mount: absolute (matches SSR). After mount: relative, with the
  // absolute UTC kept in the tooltip (and inline when showAbsolute is set).
  const timePart = rel ?? WHEN;

  return (
    <span className={className} title={`Commit ${SHA} · built ${WHEN}`}>
      v{SHA} · {timePart}
      {showAbsolute && rel ? ` · ${WHEN}` : ""}
    </span>
  );
}
