import { prisma } from "@/lib/prisma";
import {
  ACCESS_TTL_MS, CODE_TTL_MS, KEY_PREFIX, REFRESH_TTL_MS, hashOf, looksLike, newSecret, pkceMatches, type AppClient,
} from "@/lib/oauth";

// What is stored when an app is connected to an account, and the three moments
// it changes: a person says yes (a code), the app collects (a pair of keys),
// and the app comes back for a fresh pair. The rules themselves are in oauth.ts.
//
// Two of these must each happen exactly once however many requests race for
// them: a code is spent, and a refresh key is replaced. The database driver
// here has no transactions (see prisma.ts), so each is written as one SQL
// statement that both checks and changes, and the row count is the answer.

/** The pair of keys an app holds, as the token endpoint answers. */
export interface Keys {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

/** Records a "yes" and returns the code the app will collect with. */
export async function issueCode(
  userId: string,
  client: AppClient,
  redirectUri: string,
  codeChallenge: string,
): Promise<string> {
  const code = newSecret(KEY_PREFIX.code);
  await prisma.connectCode.create({
    data: {
      codeHash: hashOf(code),
      userId,
      clientId: client.id,
      clientName: client.name,
      redirectUri,
      codeChallenge,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

function freshKeys() {
  const accessToken = newSecret(KEY_PREFIX.access);
  const refreshToken = newSecret(KEY_PREFIX.refresh);
  const now = Date.now();
  return {
    keys: { accessToken, refreshToken, expiresInSeconds: Math.floor(ACCESS_TTL_MS / 1000) } satisfies Keys,
    row: {
      accessHash: hashOf(accessToken),
      accessExpires: new Date(now + ACCESS_TTL_MS),
      refreshHash: hashOf(refreshToken),
      refreshExpires: new Date(now + REFRESH_TTL_MS),
    },
  };
}

/**
 * Swaps a code for keys. Null when the code is unknown, used, too old, or
 * presented by anyone but the app it was made for.
 */
export async function redeemCode(input: {
  code: string;
  clientId: string;
  redirectUri?: string;
  codeVerifier: string;
}): Promise<Keys | null> {
  if (!looksLike(KEY_PREFIX.code, input.code)) return null;
  // Deleting is the check: whoever gets the row back has the only use of it.
  const spent = await prisma.$queryRaw<
    { userId: string; clientId: string; clientName: string; redirectUri: string; codeChallenge: string; expiresAt: Date }[]
  >`
    DELETE FROM "ConnectCode" WHERE "codeHash" = ${hashOf(input.code)}
    RETURNING "userId", "clientId", "clientName", "redirectUri", "codeChallenge", "expiresAt"
  `;
  const row = spent[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  if (row.clientId !== input.clientId) return null;
  if (input.redirectUri !== undefined && input.redirectUri !== row.redirectUri) return null;
  if (!pkceMatches(input.codeVerifier, row.codeChallenge)) return null;

  // Housekeeping while we are here: what has lapsed is cleared out. An earlier
  // connection from the same app is left alone, since it may be the same app
  // on the person's other computer.
  await prisma.connectedApp.deleteMany({ where: { userId: row.userId, refreshExpires: { lt: new Date() } } });
  await prisma.connectCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const { keys, row: stored } = freshKeys();
  await prisma.connectedApp.create({
    data: { userId: row.userId, clientId: row.clientId, clientName: row.clientName, ...stored },
  });
  return keys;
}

/**
 * Swaps a refresh key for a new pair. The old one stops working at once, so a
 * copied key is no use after the app's next visit. Null when it is not valid.
 */
export async function refreshKeys(refreshToken: string, clientId: string): Promise<Keys | null> {
  if (!looksLike(KEY_PREFIX.refresh, refreshToken)) return null;
  const { keys, row } = freshKeys();
  const changed = await prisma.$executeRaw`
    UPDATE "ConnectedApp"
    SET "accessHash" = ${row.accessHash}, "accessExpires" = ${row.accessExpires},
        "refreshHash" = ${row.refreshHash}, "refreshExpires" = ${row.refreshExpires}
    WHERE "refreshHash" = ${hashOf(refreshToken)} AND "clientId" = ${clientId} AND "refreshExpires" > now()
  `;
  return changed === 1 ? keys : null;
}

/** Note that an app was used at most this often: it is a "last used" date, not a log. */
const LAST_USED_EVERY_MS = 60 * 60 * 1000;

/** Whose account an access key opens, or null. */
export async function holderOf(
  accessToken: string,
): Promise<{ userId: string; clientId: string; expiresAt: Date } | null> {
  // Anything else (a mistyped owner's key, a guess) is refused here, without
  // a trip to the database: a wrong key must get the same plain "no" whether
  // or not the database can be reached.
  if (!looksLike(KEY_PREFIX.access, accessToken)) return null;
  const app = await prisma.connectedApp.findUnique({
    where: { accessHash: hashOf(accessToken) },
    select: { id: true, userId: true, clientId: true, accessExpires: true, lastUsedAt: true },
  });
  if (!app || app.accessExpires.getTime() < Date.now()) return null;
  if (!app.lastUsedAt || Date.now() - app.lastUsedAt.getTime() > LAST_USED_EVERY_MS) {
    // Best effort: a failed note must not fail the request it is about.
    await prisma.connectedApp.update({ where: { id: app.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return { userId: app.userId, clientId: app.clientId, expiresAt: app.accessExpires };
}

export interface ConnectedAppRow {
  id: string;
  name: string;
  /** The site the app is from, when it identified itself by a web address. */
  site: string | null;
  connectedAt: Date;
  lastUsedAt: Date | null;
}

/** The apps connected to an account, newest first. */
export async function connectedAppsOf(userId: string): Promise<ConnectedAppRow[]> {
  const rows = await prisma.connectedApp.findMany({
    where: { userId, refreshExpires: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, clientId: true, clientName: true, createdAt: true, lastUsedAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.clientName,
    site: r.clientId.startsWith("https://") ? new URL(r.clientId).hostname : null,
    connectedAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

/** Cuts an app off. Its keys stop working with the next request. */
export async function disconnectApp(userId: string, id: string): Promise<void> {
  await prisma.connectedApp.deleteMany({ where: { id, userId } });
}
