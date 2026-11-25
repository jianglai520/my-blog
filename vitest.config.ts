import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**", "out/**"],
    // 单测聚焦纯逻辑与权限分支，不涉及真实数据库/网络
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      // 只统计被测试实际加载的文件；测试与生成文件不计入
      exclude: [
        "e2e/**",
        "coverage/**",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "vitest.setup.ts",
        "db/schema.ts",
        "sentry.*.config.ts",
      ],
      // 保守阈值：低于当前基线，防止覆盖率继续下滑
      thresholds: {
        statements: 48,
        branches: 43,
        functions: 38,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
