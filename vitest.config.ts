import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["__tests__/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["__tests__/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["dotenv/config"],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "components",
          include: ["__tests__/components/**/*.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
