import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  authorizeProblem, isClientAddress, isOurResource, isPrivateAddress, parseReturnAddress, pkceMatches,
  readAuthorizeRequest, readClientDescription, returnAddressAllowed, returnTo,
} from "./oauth";

const ORIGIN = "https://chordsheetmaker.ai";
const VERIFIER = "a".repeat(43);
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

describe("pkceMatches", () => {
  it("accepts the verifier the challenge was made from", () => {
    expect(pkceMatches(VERIFIER, CHALLENGE)).toBe(true);
  });
  it("refuses any other verifier, and ones that are too short to be one", () => {
    expect(pkceMatches("b".repeat(43), CHALLENGE)).toBe(false);
    expect(pkceMatches("short", CHALLENGE)).toBe(false);
    expect(pkceMatches(VERIFIER, "")).toBe(false);
  });
});

describe("parseReturnAddress", () => {
  it("takes https, and http only on the person's own computer", () => {
    expect(parseReturnAddress("https://chatgpt.com/connector/callback")).not.toBeNull();
    expect(parseReturnAddress("http://localhost:8123/callback")).not.toBeNull();
    expect(parseReturnAddress("http://127.0.0.1/callback")).not.toBeNull();
    expect(parseReturnAddress("http://[::1]:9/cb")).not.toBeNull();
    expect(parseReturnAddress("http://example.com/callback")).toBeNull();
  });
  it("refuses anything that is not a plain web address", () => {
    expect(parseReturnAddress("javascript:alert(1)")).toBeNull();
    expect(parseReturnAddress("myapp://callback")).toBeNull();
    expect(parseReturnAddress("https://example.com/cb#fragment")).toBeNull();
    expect(parseReturnAddress("https://user:pw@example.com/cb")).toBeNull();
    expect(parseReturnAddress("/relative")).toBeNull();
  });
});

describe("returnAddressAllowed", () => {
  const registered = ["https://chatgpt.com/connector/callback", "http://localhost:3000/callback"];
  it("matches a web address letter for letter", () => {
    expect(returnAddressAllowed("https://chatgpt.com/connector/callback", registered)).toBe(true);
    expect(returnAddressAllowed("https://chatgpt.com/connector/callback/", registered)).toBe(false);
    expect(returnAddressAllowed("https://chatgpt.com/connector/callback?x=1", registered)).toBe(false);
    expect(returnAddressAllowed("https://chatgpt.com.evil.example/connector/callback", registered)).toBe(false);
    expect(returnAddressAllowed("https://evil.example/connector/callback", registered)).toBe(false);
  });
  it("lets the port vary on the person's own computer, and nothing else", () => {
    expect(returnAddressAllowed("http://localhost:51234/callback", registered)).toBe(true);
    expect(returnAddressAllowed("http://localhost:51234/other", registered)).toBe(false);
    expect(returnAddressAllowed("http://127.0.0.1:3000/callback", registered)).toBe(false);
  });
  it("does not let the port vary on the web", () => {
    expect(returnAddressAllowed("https://chatgpt.com:8443/connector/callback", registered)).toBe(false);
  });
});

describe("returnTo", () => {
  it("adds the answer and keeps what the address already had", () => {
    expect(returnTo("https://app.example/cb?keep=1", { code: "abc", state: "s 1", iss: ORIGIN, error: undefined }))
      .toBe("https://app.example/cb?keep=1&code=abc&state=s+1&iss=https%3A%2F%2Fchordsheetmaker.ai");
  });
});

describe("isClientAddress", () => {
  it("is an https address with a path", () => {
    expect(isClientAddress("https://app.example.com/oauth/client.json")).toBe(true);
    expect(isClientAddress("https://app.example.com/")).toBe(false);
    expect(isClientAddress("https://app.example.com")).toBe(false);
    expect(isClientAddress("http://app.example.com/client.json")).toBe(false);
    expect(isClientAddress("cmb1234567890abcdef")).toBe(false);
  });
  it("refuses addresses that are not exactly what would be fetched", () => {
    expect(isClientAddress("https://app.example.com/a/../client.json")).toBe(false);
    expect(isClientAddress("https://app.example.com/client.json#x")).toBe(false);
    expect(isClientAddress("https://user@app.example.com/client.json")).toBe(false);
    expect(isClientAddress("https://APP.example.com/client.json")).toBe(false);
  });
});

describe("readClientDescription", () => {
  it("reads a name and the return addresses", () => {
    expect(readClientDescription(
      { client_name: "  Example App ", redirect_uris: ["https://app.example/cb"] }, { nameRequired: true },
    )).toEqual({ name: "Example App", redirectUris: ["https://app.example/cb"] });
  });
  it("strips characters that could disguise a name, and keeps it short", () => {
    const described = readClientDescription(
      // A right-to-left override and a bell: neither belongs in a name.
      { client_name: "Chat" + String.fromCodePoint(0x202e) + "GPT" + String.fromCodePoint(0x07) + "x".repeat(100), redirect_uris: ["https://app.example/cb"] },
      { nameRequired: true },
    );
    expect(typeof described).toBe("object");
    const name = (described as { name: string }).name;
    expect(name.startsWith("ChatGPT")).toBe(true);
    expect(name.length).toBe(60);
  });
  it("needs a name only when asked to", () => {
    const doc = { redirect_uris: ["https://app.example/cb"] };
    expect(typeof readClientDescription(doc, { nameRequired: true })).toBe("string");
    expect(readClientDescription(doc, { nameRequired: false })).toEqual({ name: "An app", redirectUris: ["https://app.example/cb"] });
  });
  it("refuses bad return addresses and things that are not a description", () => {
    expect(typeof readClientDescription({ client_name: "A", redirect_uris: [] }, { nameRequired: true })).toBe("string");
    expect(typeof readClientDescription({ client_name: "A", redirect_uris: ["http://evil.example/cb"] }, { nameRequired: true })).toBe("string");
    expect(typeof readClientDescription({ client_name: "A", redirect_uris: "https://app.example/cb" }, { nameRequired: true })).toBe("string");
    expect(typeof readClientDescription(null, { nameRequired: true })).toBe("string");
    expect(typeof readClientDescription([], { nameRequired: true })).toBe("string");
  });
});

describe("isPrivateAddress", () => {
  it("knows this machine, private networks and link-local addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:7f00:1", "not-an-ip"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("lets ordinary internet addresses through", () => {
    for (const ip of ["8.8.8.8", "172.15.0.1", "172.32.0.1", "100.63.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("isOurResource", () => {
  it("accepts this site's MCP address, or none given", () => {
    expect(isOurResource(undefined, ORIGIN)).toBe(true);
    expect(isOurResource("https://chordsheetmaker.ai/api/mcp", ORIGIN)).toBe(true);
    expect(isOurResource("https://chordsheetmaker.ai/api/mcp/", ORIGIN)).toBe(true);
    expect(isOurResource("https://ChordSheetMaker.ai/api/mcp", ORIGIN)).toBe(true);
  });
  it("refuses any other", () => {
    expect(isOurResource("https://chordsheetmaker.ai", ORIGIN)).toBe(false);
    expect(isOurResource("https://other.example/api/mcp", ORIGIN)).toBe(false);
  });
});

describe("authorizeProblem", () => {
  const fields: Record<string, string> = {
    client_id: "https://app.example.com/client.json",
    redirect_uri: "https://app.example.com/cb",
    response_type: "code",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "xyz",
    resource: "https://chordsheetmaker.ai/api/mcp",
  };
  const good = readAuthorizeRequest((key) => fields[key]);

  it("finds nothing wrong with a complete request", () => {
    expect(authorizeProblem(good, ORIGIN)).toBeNull();
  });
  it("needs every part", () => {
    expect(authorizeProblem({ ...good, client_id: undefined }, ORIGIN)).not.toBeNull();
    expect(authorizeProblem({ ...good, redirect_uri: "http://evil.example/cb" }, ORIGIN)).not.toBeNull();
    expect(authorizeProblem({ ...good, response_type: "token" }, ORIGIN)).not.toBeNull();
    expect(authorizeProblem({ ...good, code_challenge: undefined }, ORIGIN)).not.toBeNull();
    expect(authorizeProblem({ ...good, code_challenge_method: "plain" }, ORIGIN)).not.toBeNull();
    expect(authorizeProblem({ ...good, resource: "https://other.example/mcp" }, ORIGIN)).not.toBeNull();
  });
  it("reads only text, so a repeated field counts as missing", () => {
    const repeated = readAuthorizeRequest((key) => (key === "client_id" ? ["a", "b"] : "x"));
    expect(repeated.client_id).toBeUndefined();
  });
});
