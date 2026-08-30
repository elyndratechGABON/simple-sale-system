import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    setupFiles: ["src/lib/syncengine/__tests__/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
