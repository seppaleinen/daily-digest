import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(): ReturnType<typeof drizzle> {
  if (!dbInstance) {
    const sqlite = new Database("data/spool.db");
    sqlite.pragma("journal_mode=WAL");
    sqlite.pragma("foreign_keys=ON");
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}
