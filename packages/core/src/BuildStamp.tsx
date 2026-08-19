"use client";

// "What's deployed" stamp: commit + build time.
//
// Both values are inlined at build time by each app's next.config.ts, which
// sets NEXT_PUBLIC_COMMIT_SHA and NEXT_PUBLIC_BUILD_TIME under `env`. That
// substitution reaches this file because the apps list @clavos/core in
// transpilePackages — without that, the names would survive to the browser as
// undefined and the stamp would read "vdev · local".
//
// The commit and the absolute UTC are static, so they match what the server
// rendered. The "N minutes ago" is computed after mount instead: it depends on
// the current time, which differs between server and client. Rendering the
// absolute time first and swapping once mounted keeps hydration clean.

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
  /** Show the absolute UTC beside the relative time, not only in the tooltip. */
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
