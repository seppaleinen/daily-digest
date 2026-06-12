import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "node:path";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb(): ReturnType<typeof drizzle> {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_URL || path.resolve(process.cwd(), "../../data/spool.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode=WAL");
    sqlite.pragma("foreign_keys=ON");
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}
