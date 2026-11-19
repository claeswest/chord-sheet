// Read by playwright.config.ts (to start the test server) and by the tests.

/**
 * The key the test server's MCP endpoint takes. It opens nothing real: that
 * server has no database behind it, and no other server knows this key.
 */
export const TEST_MCP_KEY = "e2e-only-mcp-key-opens-nothing-real-0000";
