import path from "node:path";
import { defineConfig } from "vitest/config";

// Real-org smoke test: SMOKE=1 plus SF_LOGIN_URL, SF_CLIENT_ID, SF_CLIENT_SECRET.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.smoke.test.ts"],
    testTimeout: 30_000,
  },
});
