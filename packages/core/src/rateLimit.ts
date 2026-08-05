import type { NextRequest } from "next/server";

// Lightweight in-memory rate limiter for the AI routes.
//
// Guests can use the AI endpoints without an account (deliberate — the demo
// flow depends on it), which leaves them open to abuse. This limiter caps
// requests per IP per route within a sliding window.
//
// Honest limitation: state is per serverless instance, so a determined
// attacker hitting many cold instances can exceed the nominal limit. It still
// stops the common cases (scripted loops, a stuck client) at zero
// infrastructure cost. Swap for Redis/Upstash if real abuse shows up.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 * `key` should combine route + IP, e.g. `search:1.2.3.4`.
 */
export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
