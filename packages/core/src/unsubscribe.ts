// One-click unsubscribe tokens.
//
// An HMAC of the user id rather than a stored token: nothing to migrate,
// nothing to expire, and the link keeps working from an email someone opens
// two years from now. Cost: rotating AUTH_SECRET invalidates every link in
// every inbox, which is the right trade for a secret that should not rotate.
//
// Deliberately not a session. Unsubscribing must work from a mail client with
// no cookies, on a phone, for someone who has forgotten they have an account —
// asking them to log in first is how you get a spam complaint instead.

import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret";
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = unsubscribeToken(userId);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    // Different lengths — timingSafeEqual throws rather than returning false.
    return false;
  }
}
