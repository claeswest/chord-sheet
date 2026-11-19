import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { isClientAddress, isPrivateAddress, readClientDescription, type AppClient } from "@/lib/oauth";

// Finding out who an app is, from the id it sends. There are two kinds:
//
//   - A web address (https://chatgpt.com/…/client.json). The app's maker
//     serves a short description there: its name, and where a person may be
//     sent back to. We fetch it each time. This is what the MCP specification
//     recommends, and it needs nothing stored here.
//   - An id from /api/oauth/register, the older way, kept in AppRegistration.
//
// Either way the name is only what the app says about itself. What a person
// can actually check is where they will be sent back to, which is why the
// Allow page shows that and not just the name.

const FETCH_TIMEOUT_MS = 5000;
const MAX_DOCUMENT_BYTES = 64 * 1024;

/**
 * Whether it is safe to fetch from a host: it must be a name (not a bare
 * number), and resolve only to addresses out on the internet. The address in
 * a request to connect is chosen by whoever made the link, and this stops it
 * being used to make our server call something on a private network.
 */
async function isPublicHost(hostname: string): Promise<boolean> {
  if (isIP(hostname.replace(/^\[|\]$/g, "")) !== 0) return false;
  if (!hostname.includes(".") || /\.(localhost|local|internal|test|invalid)$/i.test(hostname)) return false;
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/** The body of a response as text, or null when it is larger than we will read. */
async function readCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Fetches and checks the description an app serves at its own id. */
async function clientAtAddress(address: string): Promise<AppClient | null> {
  if (!(await isPublicHost(new URL(address).hostname))) return null;
  try {
    const res = await fetch(address, {
      // A redirect could lead anywhere, including somewhere private.
      redirect: "error",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await readCapped(res);
    if (text === null) return null;
    const doc = JSON.parse(text) as Record<string, unknown>;
    // The document must name the very address it was fetched from, or anyone
    // could point at someone else's description and borrow their name.
    if (doc.client_id !== address) return null;
    const described = readClientDescription(doc, { nameRequired: true });
    if (typeof described === "string") return null;
    return { id: address, name: described.name, redirectUris: described.redirectUris, byAddress: true };
  } catch {
    return null;
  }
}

/** The app with this id, or null when there is none or it cannot be checked. */
export async function findAppClient(id: string): Promise<AppClient | null> {
  if (isClientAddress(id)) return clientAtAddress(id);
  if (!/^[a-z0-9]{10,40}$/.test(id)) return null;
  const row = await prisma.appRegistration.findUnique({
    where: { id },
    select: { id: true, name: true, redirectUris: true },
  });
  return row ? { ...row, byAddress: false } : null;
}

/** Unused registrations are kept this long. One that someone connected through is kept. */
const UNUSED_REGISTRATION_DAYS = 30;
/** More new registrations than this in an hour is not apps introducing themselves. */
const MAX_REGISTRATIONS_PER_HOUR = 200;

/**
 * Registers an app the older way. Anyone can call this, so it tidies up after
 * itself and has a ceiling: returns null when too many have been made lately.
 */
export async function registerAppClient(name: string, redirectUris: string[]): Promise<AppClient | null> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if ((await prisma.appRegistration.count({ where: { createdAt: { gte: hourAgo } } })) >= MAX_REGISTRATIONS_PER_HOUR) {
    return null;
  }
  const cutoff = new Date(Date.now() - UNUSED_REGISTRATION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    DELETE FROM "AppRegistration" r
    WHERE r."createdAt" < ${cutoff}
      AND NOT EXISTS (SELECT 1 FROM "ConnectedApp" c WHERE c."clientId" = r."id")
  `;
  const row = await prisma.appRegistration.create({
    data: { name, redirectUris },
    select: { id: true, name: true, redirectUris: true },
  });
  return { ...row, byAddress: false };
}
