// Generate the APPLE_CLIENT_SECRET JWT for "Sign in with Apple".
//
// Apple's client secret is a short-lived (max 6 months) ES256 JWT signed with
// your Sign-in-with-Apple private key. Run this whenever it expires, then paste
// the output into the APPLE_CLIENT_SECRET env var (Vercel + .env.local).
//
// Usage (PowerShell):
//   $env:APPLE_TEAM_ID="ABCDE12345"
//   $env:APPLE_KEY_ID="XYZ987"
//   $env:APPLE_CLIENT_ID="ai.chordsheetmaker.web"   # your Services ID
//   $env:APPLE_PRIVATE_KEY_PATH="C:\path\to\AuthKey_XYZ987.p8"
//   node scripts/generate-apple-secret.mjs
//
// (You can also set APPLE_PRIVATE_KEY to the inline .p8 contents instead of a path.)

import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const clientId = process.env.APPLE_CLIENT_ID; // the Services ID
const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
const keyInline = process.env.APPLE_PRIVATE_KEY;

const missing = [];
if (!teamId) missing.push("APPLE_TEAM_ID");
if (!keyId) missing.push("APPLE_KEY_ID");
if (!clientId) missing.push("APPLE_CLIENT_ID (Services ID)");
if (!keyPath && !keyInline) missing.push("APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY");
if (missing.length) {
  console.error("Missing required env vars:\n  - " + missing.join("\n  - "));
  process.exit(1);
}

const pem = (keyInline ?? readFileSync(keyPath, "utf8")).replace(/\\n/g, "\n");

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // ~180 days (Apple max is 6 months)

const privateKey = await importPKCS8(pem, "ES256");
const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .setAudience("https://appleid.apple.com")
  .setSubject(clientId)
  .sign(privateKey);

console.log("\nAPPLE_CLIENT_SECRET (valid until " + new Date(exp * 1000).toISOString() + "):\n");
console.log(jwt);
console.log("\nSet this as APPLE_CLIENT_SECRET (and APPLE_CLIENT_ID=" + clientId + ") in Vercel + .env.local.\n");
