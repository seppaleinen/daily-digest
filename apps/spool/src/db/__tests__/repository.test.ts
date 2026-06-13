import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema";
import type { NewSpoolItem } from "../schema";
import { SpoolRepository } from "../repository";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE spool_items (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      channel_name TEXT,
      title TEXT NOT NULL,
      published_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      digest_date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  return { db: drizzle(sqlite, { schema }), sqlite };
}

// Helper that provides all required fields with sensible defaults
function defaultItem(overrides: Partial<NewSpoolItem>): NewSpoolItem {
  return {
    sourceType: "youtube",
    sourceUrl: "https://youtube.com/watch?v=default",
    channelName: "Default Channel",
    title: "Default Title",
    publishedAt: Date.now(),
    status: "pending",
    error: null,
    digestDate: "2026-06-15",
    ...overrides,
  };
}

describe("SpoolRepository", () => {
  let repo: SpoolRepository;
  let sqlite: Database.Database;

  afterEach(() => {
    sqlite.close();
  });

  beforeEach(() => {
    const { db, sqlite: s } = createTestDb();
    sqlite = s;
    repo = new SpoolRepository(db);
  });

  it("upserts and retrieves an item", async () => {
    const id = await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Test Video" })
    );

    const item = await repo.getItemById(id);
    expect(item).not.toBeNull();
    expect(item!.title).toBe("Test Video");
    expect(item!.status).toBe("pending");
  });

  it("upserts with same sourceUrl returns first id but updates fields", async () => {
    const id1 = await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Original Title" })
    );

    const id2 = await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Updated Title", status: "done" })
    );

    // id2 is a new UUID but the DB row was updated
    expect(id2).not.toBe(id1);

    const item = await repo.getItemById(id1);
    expect(item!.title).toBe("Updated Title");
    expect(item!.status).toBe("done");
  });

  it("getItemsByStatus returns only matching items", async () => {
    await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc1", title: "Video One" })
    );
    await repo.upsertItem(
      defaultItem({ sourceType: "podcast", sourceUrl: "https://example.com/podcast/1", title: "Podcast One", status: "done" })
    );

    const pending = await repo.getItemsByStatus("pending");
    expect(pending.length).toBe(1);
    expect(pending[0].sourceType).toBe("youtube");

    const done = await repo.getItemsByStatus("done");
    expect(done.length).toBe(1);
    expect(done[0].sourceType).toBe("podcast");
  });

  it("getAllItems returns all items", async () => {
    await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc1", title: "Video" })
    );
    await repo.upsertItem(
      defaultItem({ sourceType: "podcast", sourceUrl: "https://example.com/podcast/1", title: "Podcast", status: "done" })
    );

    const all = await repo.getAllItems();
    expect(all.length).toBe(2);
  });

  it("updateStatus changes status and sets updatedAt", async () => {
    const id = await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Video" })
    );

    await repo.updateStatus(id, "transcribing");
    const item = await repo.getItemById(id);
    expect(item!.status).toBe("transcribing");
    expect(item!.updatedAt).toBeGreaterThanOrEqual(item!.createdAt);
  });

  it("getBySourceUrl returns correct item", async () => {
    await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Video" })
    );

    const item = await repo.getBySourceUrl("https://youtube.com/watch?v=abc");
    expect(item).not.toBeNull();
    expect(item!.title).toBe("Video");
  });

  it("getBySourceUrl returns null for unknown URL", async () => {
    const item = await repo.getBySourceUrl("https://unknown.com");
    expect(item).toBeNull();
  });

  it("getFailedItems returns only failed items", async () => {
    await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Video", status: "failed", error: "Something went wrong" })
    );
    await repo.upsertItem(
      defaultItem({ sourceType: "podcast", sourceUrl: "https://example.com/podcast/1", title: "Podcast", status: "done" })
    );

    const failed = await repo.getFailedItems();
    expect(failed.length).toBe(1);
    expect(failed[0].sourceType).toBe("youtube");
    expect(failed[0].error).toBe("Something went wrong");
  });

  it("getItemById returns null for missing id", async () => {
    const item = await repo.getItemById("nonexistent");
    expect(item).toBeNull();
  });

  it("handles missing channelName", async () => {
    const id = await repo.upsertItem(
      defaultItem({ sourceUrl: "https://youtube.com/watch?v=abc", title: "Video", channelName: null })
    );

    const item = await repo.getItemById(id);
    expect(item!.channelName).toBeNull();
  });
});
