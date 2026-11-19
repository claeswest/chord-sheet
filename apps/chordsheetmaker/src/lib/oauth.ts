import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// The rules for signing an AI app (ChatGPT, Claude) in to one person's account,
// so that it can use /api/mcp as that person. This is OAuth 2.1 as the MCP
// specification of 2026-07-28 asks for it; the site is its own authorization
// server because NextAuth only signs people in to the site, it does not hand
// out keys to other programs.
//
// Everything here is plain logic with no database and no network, so it can be
// unit-tested (oauth.test.ts). The parts that store and fetch are in
// connectedApps.ts and appClients.ts.
//
// How a connection is made:
//
//   1. The app asks /api/mcp for something, is refused, and is told where the
//      two discovery documents are (/.well-known/…).
//   2. It says who it is: by a web address that serves a description of it, or,
//      the older way, by registering at /api/oauth/register.
//   3. It sends the person's browser to /oauth/authorize. They sign in, see what
//      the app is and what it may do, and choose Allow.
//   4. The browser is sent back to the app with a code that works once.
//   5. The app swaps the code for two keys at /api/oauth/token.

/**
 * The switch. Off (the default) and none of this exists: the discovery
 * documents are 404 and /api/mcp is the owner's alone, as it was. It is a
 * switch and not just "ship it" because the three tables have to be created in
 * a database before the routes that use them can be reached.
 */
export function userAccessOn(): boolean {
  return process.env.MCP_USER_ACCESS === "on";
}

/** The one thing an app can be allowed: to work with the person's songs. */
export const SCOPE = "songs";

/** A "yes" must be collected within this. Long enough for a slow network. */
export const CODE_TTL_MS = 2 * 60 * 1000;
/** The key sent with each request. Short, so a leaked one soon stops working. */
export const ACCESS_TTL_MS = 60 * 60 * 1000;
/** How long an app that is never used stays connected. Each use starts it again. */
export const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

// ── Addresses ────────────────────────────────────────────────────────────────

/** Where the app is served from, as the request reached it. */
export const originOf = (request: Request) => new URL(request.url).origin;

/** The MCP server's own address: what a key is issued for. */
export const mcpUrl = (origin: string) => `${origin}/api/mcp`;

/** Where an app is told to look for {@link protectedResourceDocument}. */
export const protectedResourceUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource/api/mcp`;

/** Says which server hands out keys for /api/mcp (RFC 9728). */
export function protectedResourceDocument(origin: string) {
  return {
    resource: mcpUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "ChordSheetMaker",
  };
}

/** Says how to get a key here (RFC 8414). */
export function authorizationServerDocument(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // An app without this line must refuse to go on, by the MCP rules.
    code_challenge_methods_supported: ["S256"],
    // Apps hold no password of their own here: the proof is PKCE.
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
  };
}

/** True when an app asked for a key to this server, or did not say which. */
export function isOurResource(resource: string | undefined, origin: string): boolean {
  if (!resource) return true;
  const strip = (s: string) => s.replace(/\/$/, "").toLowerCase();
  return strip(resource) === strip(mcpUrl(origin));
}

// ── Keys ─────────────────────────────────────────────────────────────────────

/**
 * How each kind of key starts. It says what a key is when one turns up in a
 * log, and lets anything that does not start like an access key be refused
 * without asking the database about it.
 */
export const KEY_PREFIX = { code: "csm_code", access: "csm_at", refresh: "csm_rt" } as const;

/** A new random key of one kind. */
export const newSecret = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;

/** Whether a key is even shaped like one of ours of that kind. */
export const looksLike = (prefix: string, key: string) => key.startsWith(`${prefix}_`) && key.length < 200;

/** What is stored instead of a key. The keys are long and random, so a plain hash is enough. */
export const hashOf = (secret: string) => createHash("sha256").update(secret).digest("hex");

/**
 * PKCE: the app sent a hash when it asked, and sends what the hash was made
 * from when it collects. Someone who only saw the code in passing has neither.
 */
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const made = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const given = Buffer.from(challenge);
  return made.length === given.length && timingSafeEqual(made, given);
}

// ── Where a person may be sent back to ───────────────────────────────────────

const THIS_COMPUTER = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * A return address we are willing to send someone to: https, or plain http on
 * the person's own computer (a desktop app listening for the answer). Nothing
 * else, so no `javascript:` and no made-up schemes.
 */
export function parseReturnAddress(value: string): URL | null {
  if (typeof value !== "string" || value.length > 2000 || value.includes("#")) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol === "https:") return url;
  if (url.protocol === "http:" && THIS_COMPUTER.has(url.hostname)) return url;
  return null;
}

/** An address on the person's own computer rather than out on the web. */
export const isThisComputer = (url: URL) => url.protocol === "http:" && THIS_COMPUTER.has(url.hostname);

/**
 * Whether an app may have the person sent to `requested`: only if it is one of
 * the addresses the app gave when it said who it was, letter for letter. The
 * one allowance is the port of an address on the person's own computer, which
 * a desktop app picks afresh each time (RFC 8252 §7.3).
 */
export function returnAddressAllowed(requested: string, registered: string[]): boolean {
  const want = parseReturnAddress(requested);
  if (!want) return false;
  return registered.some((r) => {
    if (r === requested) return true;
    const have = parseReturnAddress(r);
    return (
      !!have && isThisComputer(want) && isThisComputer(have) &&
      have.hostname === want.hostname && have.pathname === want.pathname && have.search === want.search
    );
  });
}

/** `address` with the answer added to it: a code, or an error. */
export function returnTo(address: string, answer: Record<string, string | undefined>): string {
  const url = new URL(address);
  for (const [key, value] of Object.entries(answer)) if (value) url.searchParams.set(key, value);
  return url.toString();
}

// ── Who the app is ───────────────────────────────────────────────────────────

/** An app, as far as this server knows it. */
export interface AppClient {
  id: string;
  name: string;
  redirectUris: string[];
  /** Identified by a web address it controls, rather than by registering here. */
  byAddress: boolean;
}

/**
 * Whether an app's id is a web address that should serve a description of the
 * app (a "Client ID Metadata Document"): https, with a path, and nothing odd.
 */
export function isClientAddress(id: string): boolean {
  if (id.length > 500 || !id.startsWith("https://") || id.includes("#")) return false;
  let url: URL;
  try {
    url = new URL(id);
  } catch {
    return false;
  }
  // What we fetch must be exactly what was sent: no "/../", no stray spaces.
  if (url.href !== id) return false;
  if (url.username || url.password || url.pathname === "/") return false;
  return !/\/\.{1,2}(\/|$)/.test(url.pathname);
}

/**
 * Control characters, and the invisible ones that hide or reorder text (zero
 * width, right-to-left overrides). Written as code points so that none of
 * them has to appear in this file.
 */
const UNPRINTABLE = new RegExp(
  "[" +
    [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2066, 0x2069]]
      .map(([from, to]) => `\\u{${from.toString(16)}}-\\u{${to.toString(16)}}`)
      .join("") +
    "]",
  "gu",
);

/**
 * What an app says about itself, checked: a name to show the person, and the
 * addresses they may be sent back to. Returns a sentence when it will not do.
 */
export function readClientDescription(
  doc: unknown,
  { nameRequired }: { nameRequired: boolean },
): { name: string; redirectUris: string[] } | string {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) return "The description must be a JSON object.";
  const d = doc as Record<string, unknown>;

  const uris = d.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10) return "redirect_uris must list between 1 and 10 addresses.";
  for (const uri of uris) {
    if (typeof uri !== "string" || !parseReturnAddress(uri)) {
      return "Each redirect_uri must be an https address, or http on localhost, with no fragment.";
    }
  }

  // The name is shown to a person deciding whether to trust the app, so it is
  // kept short and to printable characters.
  const raw = typeof d.client_name === "string" ? d.client_name : "";
  const name = raw.replace(UNPRINTABLE, "").trim().slice(0, 60);
  if (!name && nameRequired) return "client_name is required.";

  return { name: name || "An app", redirectUris: uris as string[] };
}

/**
 * Whether an internet address is one a server should not be talked into
 * fetching from: this machine, a private network, a link-local address. Used
 * before an app's description is fetched from the address it gave.
 */
export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const v4 = mapped ? mapped[1] : ip;
  const parts = v4.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (!v6.includes(":")) return true; // not an address at all: refuse
  return (
    v6 === "::" || v6 === "::1" ||
    /^f[cd]/.test(v6) ||      // fc00::/7, private
    /^fe[89ab]/.test(v6) ||   // fe80::/10, link-local
    v6.startsWith("::ffff:")  // any other mapped form
  );
}

// ── The request to connect ───────────────────────────────────────────────────

export const AUTHORIZE_FIELDS = [
  "client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource",
] as const;
export type AuthorizeRequest = Record<(typeof AUTHORIZE_FIELDS)[number], string | undefined>;

/** Reads a request to connect from a query string or a posted form. */
export function readAuthorizeRequest(get: (key: string) => unknown): AuthorizeRequest {
  const out = {} as AuthorizeRequest;
  for (const key of AUTHORIZE_FIELDS) {
    const value = get(key);
    out[key] = typeof value === "string" && value.length > 0 && value.length <= 2000 ? value : undefined;
  }
  return out;
}

/**
 * What is wrong with a request to connect, before anyone is asked anything, or
 * null. In words for the person looking at the page: the app made the request,
 * but they are the one who sees it fail.
 */
export function authorizeProblem(request: AuthorizeRequest, origin: string): string | null {
  if (!request.client_id) return "The app did not say who it is.";
  if (!request.redirect_uri || !parseReturnAddress(request.redirect_uri)) {
    return "The app did not give a valid address to send you back to.";
  }
  if (request.response_type !== "code") return "The app asked for a kind of sign-in this site does not offer.";
  if (!request.code_challenge || !/^[A-Za-z0-9\-_]{43}$/.test(request.code_challenge) || request.code_challenge_method !== "S256") {
    return "The app left out a security step (PKCE with S256) that this site requires.";
  }
  if (!isOurResource(request.resource, origin)) return "The app asked for access to a different service.";
  return null;
}

// ── Answers to apps ──────────────────────────────────────────────────────────

// The discovery documents, registration and the token endpoint are called by
// programs, some of them running in a browser on another site. None of them
// reads a cookie, so any site may call them.
const OPEN = { "Access-Control-Allow-Origin": "*" };

/** A JSON answer any site may read, never cached: some of these carry keys. */
export const openJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...OPEN, "Cache-Control": "no-store", ...headers } });

/** The answer to a browser asking whether it may call. */
export const preflight = (methods: string) =>
  new Response(null, {
    status: 204,
    headers: {
      ...OPEN,
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
    },
  });

/** What every route here answers while the switch is off: there is nothing here. */
export const notHere = () => new Response("Not found", { status: 404 });

/** An error in the shape OAuth clients expect (RFC 6749 §5.2). */
export const oauthError = (status: number, error: string, description: string) =>
  openJson({ error, error_description: description }, status);
