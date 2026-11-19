// The MCP server at /api/mcp is the owner's own door into the app for an AI
// client. What matters most is that it stays shut to everyone else, so that is
// what is tested here, on every push. (What the tools do with a database is
// not: the test server has none.)

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
