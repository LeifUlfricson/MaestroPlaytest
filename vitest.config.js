import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/rules/**/*.test.js", "src/link/**/*.test.js"],
    passWithNoTests: true,
  },
});
