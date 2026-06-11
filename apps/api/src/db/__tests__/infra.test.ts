import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as schema from "../schema";
import Database from "better-sqlite3";

const TEST_DB_PATH = path.join(process.cwd(), "test_infra.db");

describe("Infrastructure: getDb connectivity", () => {
  beforeEach(async () => {
    // Clear module cache to force re-evaluation of getDb
    vi.resetModules();
    process.env.DATABASE_URL = TEST_DB_PATH;
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Run migrations
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const migrationPath = path.resolve(__dirname, "../../../drizzle/0000_nice_ezekiel.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    const sqlite = new Database(TEST_DB_PATH);
    sqlite.exec(sql);
    sqlite.close();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    delete process.env.DATABASE_URL;
  });

  it("connects to and writes to a file-system-backed database", async () => {
    // Dynamically import getDb after resetting modules
    const { getDb } = await import("../index");
    const db = getDb();

    // Attempt a write
    await db.insert(schema.digestItems).values({
      date: "2026-01-01",
      source: "email",
      title: "Infra Test",
      html: "Test",
    });

    // Verify file existence and content
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);

    // Re-import to check persistence
    vi.resetModules();
    const { getDb: getDbNew } = await import("../index");
    const dbNew = getDbNew();

    const results = await dbNew.select().from(schema.digestItems);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Infra Test");
  });
});
