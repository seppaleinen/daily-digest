import { drizzle } from "drizzle-orm/better-sqlite3";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const Database = (await import("better-sqlite3")).default;
import { digestItems } from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(): ReturnType<typeof drizzle> {
  if (!dbInstance) {
    const sqlite = new Database(process.env.DATABASE_URL || ":memory:");
    sqlite.pragma("journal_mode=WAL");
    sqlite.pragma("foreign_keys=ON");
    dbInstance = drizzle(sqlite, { schema: { digestItems } });
  }
  return dbInstance;
}
