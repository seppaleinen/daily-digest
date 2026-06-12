import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    server: {
      deps: {
        inline: ["@daily-digest/shared"],
      },
    },
  },
  resolve: {
    alias: {
      "@daily-digest/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
});







