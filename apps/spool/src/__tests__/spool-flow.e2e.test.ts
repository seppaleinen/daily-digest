import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { Hono } from "hono";
import { serve, type ServerType } from "@hono/node-server";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import type { SpoolSourceType, SpoolStatus } from "../db/schema";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createDigestHandler } from "../../../api/src/routes/digest";
import * as apiSchema from "../../../api/src/db/schema";
import * as spoolSchema from "../db/schema";

// ─── DDL from TypeScript schemas ───────────────────────────
const API_DDL = `
CREATE TABLE IF NOT EXISTS digest_items (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  date text NOT NULL,
  category text DEFAULT 'general' NOT NULL,
  source text NOT NULL,
  title text NOT NULL,
  html text NOT NULL,
  source_url text NOT NULL,
  created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

const SPOOL_DDL = `
CREATE TABLE IF NOT EXISTS spool_items (
  id text PRIMARY KEY NOT NULL,
  source_type text NOT NULL,
  source_url text UNIQUE NOT NULL,
  channel_name text,
  title text NOT NULL,
  published_at integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  digest_date text NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
`;

// ─── Test globals ──────────────────────────────────────────
let orchestration: any;
let apiDbHandle: ReturnType<typeof drizzle>;
let apiServer: ServerType;
let tmpDir: string;
let spoolDbPath: string;
let apiDbPath: string;
let apiSqlite: Database;

// ─── Mock services ─────────────────────────────────────────
const mockYoutubeExtraction = {
  extractAudio: vi.fn<[string, string], Promise<void>>(),
};
const mockAudioExtraction = {
  downloadAudio: vi.fn<[string, string], Promise<void>>(),
};
const mockTranscription = {
  transcribe: vi.fn<[string], Promise<string>>(),
};
const mockSummarization = {
  summarize: vi.fn<[string], Promise<string>>(),
};

// ─── Helpers ───────────────────────────────────────────────
function initDatabase(dbPath: string, ddl: string) {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode=WAL");
  sqlite.pragma("foreign_keys=ON");
  sqlite.exec(ddl);
  sqlite.close();
}

async function insertSpoolItem(item: {
  sourceType: string;
  sourceUrl: string;
  channelName: string | null;
  title: string;
  publishedAt: number;
  status: string;
  digestDate: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const { SpoolRepository } = await import("../db/repository");
  const repo = new SpoolRepository();
  // We'll use the repository's upsertItem which takes NewSpoolItem type
  // But we need to match the type: Omit<SpoolItem, "id" | "createdAt" | "updatedAt">
  const newItem = {
    sourceType: item.sourceType as SpoolSourceType,
    sourceUrl: item.sourceUrl,
    channelName: item.channelName || '',
    title: item.title,
    publishedAt: item.publishedAt,
    status: item.status as SpoolStatus,
    digestDate: item.digestDate,
    error: null,
  };
  return await repo.upsertItem(newItem);
}

// ─── Setup / Teardown ──────────────────────────────────────
describe("spool → API integration", () => {
  beforeAll(async () => {
    // 1. Unique temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spool-e2e-"));
    spoolDbPath = path.join(tmpDir, "spool.db");
    apiDbPath = path.join(tmpDir, "api.db");

    // 2. Initialize both databases
    initDatabase(spoolDbPath, SPOOL_DDL);
    initDatabase(apiDbPath, API_DDL);

    // 3. Set env var so SpoolRepository reads the test DB
    process.env.DATABASE_URL = spoolDbPath;
    // Force module reload so getDb() picks up the new env var
    vi.resetModules();

    // 4. Create API app + get db handle
    apiSqlite = new Database(apiDbPath);
    apiSqlite.pragma("journal_mode=WAL");
    apiSqlite.pragma("foreign_keys=ON");
    apiDbHandle = drizzle(apiSqlite, { schema: apiSchema });

    const apiApp = new Hono();
    const handler = createDigestHandler(apiDbHandle);
    apiApp.post("/digest/:date/items", handler.upsertItem);
    apiApp.get("/digest", handler.listDates);
    apiApp.get("/digest/:date", handler.getItemsByDate);

    // 5. Start API on random port
    apiServer = serve({ fetch: apiApp.fetch, port: 0 });

    // 6. Wire up real DigestApiService pointed at the running API
    // After await import(), the server is listening and address() returns the port
    const { DigestApiService } = await import("../services/digest-api.service");
    const addr = apiServer.address() as { port: number };
    const digestApi = new DigestApiService(`http://127.0.0.1:${addr.port}`);

    // 7. Wire up real SpoolRepository
    const { SpoolRepository } = await import("../db/repository");
    const spoolRepo = new SpoolRepository();

    // 8. Create OrchestrationService with injected deps
    const { OrchestrationService } = await import("../services/orchestration.service");
    orchestration = new OrchestrationService({
      repository: spoolRepo,
      youtubeExtraction: mockYoutubeExtraction,
      audioExtraction: mockAudioExtraction,
      transcription: mockTranscription,
      summarization: mockSummarization,
      digestApi,
      tempDir: path.join(tmpDir, "audio"),
    });
  });

  afterAll(() => {
    apiServer?.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    delete process.env.DATABASE_URL;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockYoutubeExtraction.extractAudio.mockResolvedValue(undefined);
    mockAudioExtraction.downloadAudio.mockResolvedValue(undefined);
    mockTranscription.transcribe.mockResolvedValue("Mock transcript text.");
    mockSummarization.summarize.mockResolvedValue("<p>Mock summary.</p>");

    // Clean both databases for test isolation
    apiSqlite.exec("DELETE FROM digest_items");
    const { getDb } = await import("../db/client");
    const spoolDb = getDb();
    await spoolDb.delete(spoolSchema.spoolItems);
  });

  // ── Test 1: Happy path ──────────────────────────────────
  it("processes pending item: status done + API receives item with matching title/html", async () => {
    const digestDate = "2026-06-13";
    const itemId = await insertSpoolItem({
      sourceType: "youtube",
      sourceUrl: "https://youtube.com/watch?v=test123",
      channelName: "Test Channel",
      title: "Test Video",
      publishedAt: Date.now(),
      status: "pending",
      digestDate,
    });

    await orchestration.processQueue(digestDate);

    // Assert spool item is "done" with no error
    const { SpoolRepository } = await import("../db/repository");
    const repo = new SpoolRepository();
    const spoolItem = await repo.getItemById(itemId);
    expect(spoolItem).not.toBeNull();
    expect(spoolItem!.status).toBe("done");
    expect(spoolItem!.error).toBeNull();

    // Assert API has 1 item for that date
    const apiItems = await apiDbHandle
      .select()
      .from(apiSchema.digestItems)
      .where(eq(apiSchema.digestItems.date, digestDate));
    expect(apiItems.length).toBe(1);
    expect(apiItems[0].title).toBe("Test Video");
    expect(apiItems[0].html).toBe("<p>Mock summary.</p>");
    expect(apiItems[0].sourceUrl).toBe("https://youtube.com/watch?v=test123");

    // Verify mock call chain — YouTube path uses youtubeExtraction
    expect(mockYoutubeExtraction.extractAudio).toHaveBeenCalledWith(
      "https://youtube.com/watch?v=test123",
      expect.stringContaining(".mp3")
    );
    expect(mockAudioExtraction.downloadAudio).not.toHaveBeenCalled();
    expect(mockTranscription.transcribe).toHaveBeenCalledOnce();
    expect(mockSummarization.summarize).toHaveBeenCalledWith("Mock transcript text.");
  });

  // ── Test 2: Podcast — download + transcription failure ──
  it("marks item as failed when transcription throws", async () => {
    const digestDate = "2026-06-13";
    mockTranscription.transcribe.mockRejectedValue(new Error("API timeout"));

    const itemId = await insertSpoolItem({
      sourceType: "podcast",
      sourceUrl: "https://example.com/podcast/1",
      channelName: "Podcast Channel",
      title: "Failed Podcast Episode",
      publishedAt: Date.now(),
      status: "pending",
      digestDate,
    });

    await orchestration.processQueue(digestDate);

    const { SpoolRepository } = await import("../db/repository");
    const repo = new SpoolRepository();
    const spoolItem = await repo.getItemById(itemId);
    expect(spoolItem).not.toBeNull();
    expect(spoolItem!.status).toBe("failed");
    expect(spoolItem!.error).toContain("API timeout");

    // Verify podcast path used audioExtraction, not youtubeExtraction
    expect(mockAudioExtraction.downloadAudio).toHaveBeenCalledWith(
      "https://example.com/podcast/1",
      expect.stringContaining(".mp3")
    );
    expect(mockYoutubeExtraction.extractAudio).not.toHaveBeenCalled();

    // API should have NO items (pipeline failed before pushing)
    const apiItems = await apiDbHandle
      .select()
      .from(apiSchema.digestItems)
      .where(eq(apiSchema.digestItems.date, digestDate));
    expect(apiItems.length).toBe(0);
  });

  // ── Test 3: Multiple items processed sequentially ────────
  it("processes multiple items sequentially across dates", async () => {
    const date1 = "2026-06-14";
    const date2 = "2026-06-15";

    // Insert first item and process immediately (only this item is pending)
    await insertSpoolItem({
      sourceType: "youtube",
      sourceUrl: "https://youtube.com/watch?v=video1",
      channelName: "Channel A",
      title: "Video One",
      publishedAt: Date.now(),
      status: "pending",
      digestDate: date1,
    });
    await orchestration.processQueue(date1);

    // Verify item1 appears on date1
    let apiItems = await apiDbHandle
      .select()
      .from(apiSchema.digestItems)
      .where(eq(apiSchema.digestItems.date, date1));
    expect(apiItems.length).toBe(1);
    expect(apiItems[0].title).toBe("Video One");

    // Insert second item and process (only this item is pending)
    await insertSpoolItem({
      sourceType: "podcast",
      sourceUrl: "https://example.com/podcast/2",
      channelName: "Channel B",
      title: "Podcast Two",
      publishedAt: Date.now(),
      status: "pending",
      digestDate: date2,
    });
    await orchestration.processQueue(date2);

    // Verify item2 appears on date2
    apiItems = await apiDbHandle
      .select()
      .from(apiSchema.digestItems)
      .where(eq(apiSchema.digestItems.date, date2));
    expect(apiItems.length).toBe(1);
    expect(apiItems[0].title).toBe("Podcast Two");

    // Verify branching: youtube item used youtubeExtraction, podcast used audioExtraction
    expect(mockYoutubeExtraction.extractAudio).toHaveBeenCalledTimes(1);
    expect(mockAudioExtraction.downloadAudio).toHaveBeenCalledTimes(1);
  });
});
