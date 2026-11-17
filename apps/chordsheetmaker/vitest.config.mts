import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests: `npm test` here, or in CI (.github/workflows/ci.yml).
//
// For code that can be checked without a browser, a database or a network —
// the pure logic in src/lib. A test file sits beside what it tests and is
// named <file>.test.ts.
export default defineConfig({
  resolve: {
    // The same "@/…" the app uses.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
