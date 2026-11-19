// The MCP server at /api/mcp is a door into the app for an AI client: the
// owner's, with a key, and each person's own, with a sign-in. What matters
// most is that both stay shut to everyone else, so that is what is tested
// here, on every push. (What the tools do with a database is not: the test
// server has none.)

import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "./fixtures";
import { TEST_MCP_KEY } from "./keys";

const LIST_TOOLS = { jsonrpc: "2.0", id: 1, method: "tools/list" };

/** One JSON-RPC message to the endpoint, the way an MCP client sends it. */
function ask(request: APIRequestContext, message: object, headers: Record<string, string> = {}, path = "/api/mcp") {
  return request.post(path, {
    data: message,
    headers: { Accept: "application/json, text/event-stream", ...headers },
  });
}

/** The JSON-RPC answer, whether it came as plain JSON or as one event of a stream. */
async function answer(response: Awaited<ReturnType<typeof ask>>) {
  const body = await response.text();
  const json = body.trimStart().startsWith("{") ? body : body.split("\n").find((line) => line.startsWith("data: "))!.slice(6);
  return JSON.parse(json);
}

test("without the key it answers 401 and says nothing about what is behind it", async ({ request }) => {
  const response = await ask(request, LIST_TOOLS);
  expect(response.status()).toBe(401);
  expect(await response.text()).not.toContain("site_numbers");
});

test("a wrong key is no better than none", async ({ request }) => {
  for (const wrong of ["nope", TEST_MCP_KEY.slice(0, -1), TEST_MCP_KEY + "0", TEST_MCP_KEY.toUpperCase()]) {
    const response = await ask(request, LIST_TOOLS, { Authorization: `Bearer ${wrong}` });
    expect(response.status(), `key "${wrong}"`).toBe(401);
  }
});

test("the key is taken from the Authorization header only, never from the address", async ({ request }) => {
  for (const path of [`/api/mcp?key=${TEST_MCP_KEY}`, `/api/mcp?token=${TEST_MCP_KEY}`, `/api/mcp?authorization=Bearer%20${TEST_MCP_KEY}`]) {
    expect((await ask(request, LIST_TOOLS, {}, path)).status()).toBe(401);
  }
  expect((await request.get("/api/mcp")).status()).toBe(401);
});

test("with the key it lists its tools, and only the song-adding one can write", async ({ request }) => {
  const response = await ask(request, LIST_TOOLS, { Authorization: `Bearer ${TEST_MCP_KEY}` });
  expect(response.status()).toBe(200);
  const tools: { name: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }[] = (await answer(response)).result.tools;

  expect(tools.map((t) => t.name).sort()).toEqual(["create_song", "get_song", "list_songs", "site_numbers"]);
  // Adding a tool that writes, or one that can destroy, should be a decision
  // somebody makes, and this is where they will be asked about it.
  expect(tools.filter((t) => !t.annotations?.readOnlyHint).map((t) => t.name)).toEqual(["create_song"]);
  expect(tools.filter((t) => t.annotations?.destructiveHint).map((t) => t.name)).toEqual([]);
});

// ── The second door: a person signing an AI app in to their own account ──────
// Signing in needs a database, which the test server has not got. What can be
// tested without one is that the door says where it is, and stays shut.

const CONNECT_REQUEST = new URLSearchParams({
  client_id: "appregistration0001",
  redirect_uri: "http://localhost:9911/callback",
  response_type: "code",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "S256",
  state: "abc",
});

test("a refusal tells an app where a person can sign it in", async ({ request, baseURL }) => {
  const refused = await ask(request, LIST_TOOLS);
  const where = refused.headers()["www-authenticate"]?.match(/resource_metadata="([^"]+)"/)?.[1];
  expect(where).toBe(`${baseURL}/.well-known/oauth-protected-resource/api/mcp`);

  const resource = await (await request.get(where!)).json();
  expect(resource.resource).toBe(`${baseURL}/api/mcp`);
  expect(resource.authorization_servers).toEqual([baseURL]);

  const server = await (await request.get("/.well-known/oauth-authorization-server")).json();
  expect(server.issuer).toBe(baseURL);
  // Without these an app must refuse to go on, or would go on unsafely.
  expect(server.code_challenge_methods_supported).toEqual(["S256"]);
  expect(server.token_endpoint_auth_methods_supported).toEqual(["none"]);
});

test("the Allow page asks for a sign-in before anything else", async ({ request }) => {
  const response = await request.get(`/oauth/authorize?${CONNECT_REQUEST}`, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toContain("/login?next=%2Foauth%2Fauthorize");
  // And it may not be shown inside another site's frame.
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("a request to connect that leaves out the security step gets no further", async ({ request }) => {
  const weak = new URLSearchParams(CONNECT_REQUEST);
  weak.set("code_challenge_method", "plain");
  const page = await (await request.get(`/oauth/authorize?${weak}`, { maxRedirects: 0 })).text();
  expect(page).toContain("This link did not work");
  expect(page).not.toContain('value="allow"');
});

test("Allow cannot be pressed from another site, or without being signed in", async ({ request, baseURL }) => {
  const form = { ...Object.fromEntries(CONNECT_REQUEST), decision: "allow" };
  const fromElsewhere = await request.post("/api/oauth/decision", { form, headers: { Origin: "https://elsewhere.example" }, maxRedirects: 0 });
  expect(fromElsewhere.status()).toBe(403);
  const signedOut = await request.post("/api/oauth/decision", { form, headers: { Origin: baseURL! }, maxRedirects: 0 });
  expect(signedOut.status()).toBe(401);
});

test("an app may only ask for a person to be sent to https, or to their own computer", async ({ request }) => {
  const response = await request.post("/api/oauth/register", {
    data: { client_name: "Test", redirect_uris: ["http://elsewhere.example/callback"] },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe("invalid_redirect_uri");
});

test("the token endpoint gives nothing for a made-up code", async ({ request }) => {
  const response = await request.post("/api/oauth/token", {
    form: { grant_type: "authorization_code", client_id: "appregistration0001", code: "made-up", code_verifier: "x".repeat(43) },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe("invalid_grant");
});

test("a tool that cannot reach the database says so plainly, and gives nothing away", async ({ request }) => {
  const response = await ask(
    request,
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_songs", arguments: {} } },
    { Authorization: `Bearer ${TEST_MCP_KEY}` },
  );
  expect(response.status()).toBe(200);
  const result = (await answer(response)).result;
  expect(result.isError).toBe(true);
  // The test server's database address is a placeholder; it must not be read back to the caller.
  expect(JSON.stringify(result)).not.toMatch(/postgres|localhost|5432|e2e:e2e/i);
});
