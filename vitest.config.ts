import { defineConfig } from "vitest/config";

const domTests = "apps/web/src/**/*.dom.test.ts";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
          exclude: [domTests],
        },
      },
      {
        test: { name: "dom", environment: "happy-dom", include: [domTests] },
      },
    ],
  },
});
