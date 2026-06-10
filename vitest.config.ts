import { defineConfig } from "vitest/config";

// Map bare "sqlite" import (used by drizzle-orm/sqlite/nodejs) to node:sqlite
const sqliteAliasPlugin = {
  name: "sqlite-alias",
  resolveId(id: string): string | void {
    if (id === "sqlite") return "node:sqLite";
  },
};

export default defineConfig({
  plugins: [sqliteAliasPlugin],
  test: {
    globals: true,
    environment: "node",
  },
});
