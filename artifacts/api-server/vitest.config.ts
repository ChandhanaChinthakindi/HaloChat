import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    env: {
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      JWT_REFRESH_SECRET: "test-jwt-refresh-secret-32-chars!!",
      LOG_LEVEL: "silent",
      NODE_ENV: "test",
      OPENAI_API_KEY: "test-openai-key",
      DAILY_COMPANION_LIMIT: "200",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/index.ts", "src/jobs/**"],
    },
  },
});
