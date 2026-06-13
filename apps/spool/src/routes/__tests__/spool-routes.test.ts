import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema";
import { SpoolRepository } from "../../db/repository";
import { createSpoolRoutes } from "../spool.routes";

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

function mockDeps(repo: SpoolRepository) {
  return {
    repository: repo,
    orchestrationService: {
      processQueue: vi.fn().mockResolvedValue(undefined),
      retryItem: vi.fn().mockResolvedValue(undefined),
    } as any,
    discoveryService: {
      runDiscovery: vi.fn().mockResolvedValue(undefined),
    } as any,
  };
}

describe("Spool routes", () => {
  let repo: SpoolRepository;
  let sqlite: Database.Database;

  beforeEach(() => {
    const { db, sqlite: s } = createTestDb();
    sqlite = s;
    repo = new SpoolRepository(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it("GET /health returns ok", async () => {
    const app = createSpoolRoutes(mockDeps(repo));
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /queue returns all items", async () => {
    await repo.upsertItem({
      sourceType: "youtube",
      sourceUrl: "https://youtube.com/watch?v=1",
      channelName: "A",
      title: "Video",
      publishedAt: Date.now(),
      status: "pending",
      error: null,
      digestDate: "2026-06-15",
    });
    await repo.upsertItem({
      sourceType: "podcast",
      sourceUrl: "https://example.com/podcast/1",
      channelName: "B",
      title: "Podcast",
      publishedAt: Date.now(),
      status: "done",
      error: null,
      digestDate: "2026-06-15",
    });

    const app = createSpoolRoutes(mockDeps(repo));
    const res = await app.request("/queue");
    expect(res.status).toBe(200);
    const items = (await res.json()) as any[];
    expect(items.length).toBe(2);
  });

  it("GET /queue?status=pending filters correctly", async () => {
    await repo.upsertItem({
      sourceType: "youtube",
      sourceUrl: "https://youtube.com/watch?v=1",
      channelName: "A",
      title: "Video",
      publishedAt: Date.now(),
      status: "pending",
      error: null,
      digestDate: "2026-06-15",
    });
    await repo.upsertItem({
      sourceType: "podcast",
      sourceUrl: "https://example.com/podcast/1",
      channelName: "B",
      title: "Podcast",
      publishedAt: Date.now(),
      status: "done",
      error: null,
      digestDate: "2026-06-15",
    });

    const app = createSpoolRoutes(mockDeps(repo));
    const res = await app.request("/queue?status=pending");
    expect(res.status).toBe(200);
    const items = (await res.json()) as any[];
    expect(items.length).toBe(1);
    expect(items[0].sourceType).toBe("youtube");
  });

  it("POST /transcribe with missing URL returns 400", async () => {
    const app = createSpoolRoutes(mockDeps(repo));
    const res = await app.request("/transcribe", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ sourceType: "youtube" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("URL is required");
  });
});
