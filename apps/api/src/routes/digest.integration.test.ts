import { describe, it, expect, beforeEach, afterAll } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const { drizzle: createDrizzleDb } = await import("drizzle-orm/better-sqlite3");
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const Database = (await import("better-sqlite3")).default;
import * as schema from "../db/schema";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function createDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys=ON");
  
  // Apply migrations from the drizzle directory
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const drizzleDir = path.resolve(__dirname, "../../drizzle");
  const sqlFiles = fs.readdirSync(drizzleDir)
    .filter(f => f.endsWith(".sql"))
    .sort();
  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
    sqlite.exec(sql);
  }
  
  const db = createDrizzleDb(sqlite, { schema: { digestItems: schema.digestItems } });
  return { db: db as ReturnType<typeof createDrizzleDb<typeof schema>>, sqlite };
}

async function createApp(db: ReturnType<typeof createDrizzleDb<typeof schema>>) {
  const { Hono } = await import("hono");
  const { createDigestHandler } = await import("../routes/digest");

  const handler = createDigestHandler(db);
  const app = new Hono();

  app.use("*", async (c, next) => {
    c.header("Content-Security-Policy", "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
    await next();
  });

  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    if (origin) {
      c.header("Access-Control-Allow-Origin", origin);
    }
    await next();
  });

  app.post("/:date/items", handler.upsertItem);
  app.get("/", handler.listDates);
  app.get("/:date", handler.getItemsByDate);

  return app;
}

describe("full flow — e2e", () => {
  let db: ReturnType<typeof createDrizzleDb<typeof schema>>;
  let app: Awaited<ReturnType<typeof createApp>>;
  let sqlite: ReturnType<typeof Database> | undefined;

  beforeEach(async () => {
    const result = await createDb();
    db = result.db;
    sqlite = result.sqlite;
    app = await createApp(db);
  });

  afterAll(() => {
    if (sqlite) sqlite.close();
  });

  it("creates item, reads date list, reads items by date — full flow", async () => {
    const createRes = await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "email", title: "Morning Digest", html: "<p>Good morning world</p>", sourceUrl: "https://example.com/article" }),
    });
    expect(createRes.status).toBe(201);
    const item = (await createRes.json()) as any;
    expect(item.source).toBe("email");
    expect(item.title).toBe("Morning Digest");

    const datesRes = await app.request("/");
    expect(datesRes.status).toBe(200);
    const dates: string[] = await datesRes.json();
    expect(dates).toContain("2026-06-09");

    const itemsRes = await app.request("/2026-06-09");
    expect(itemsRes.status).toBe(200);
    const items = (await itemsRes.json()) as any[];
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Morning Digest");

    await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "podcast", title: "Morning Digest", html: "<p>Good morning world</p>", sourceUrl: "https://example.com/article" }),
    });
    const itemsAfterUpsertRes = await app.request("/2026-06-09");
    const itemsAfterUpsert = (await itemsAfterUpsertRes.json()) as any[];
    expect(itemsAfterUpsert.length).toBe(1);
    expect(itemsAfterUpsert[0].source).toBe("podcast");

    await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "youtube", title: "Daily News", html: "<p>News summary</p>", sourceUrl: "https://example.com/article", category: "news" }),
    });
    const itemsAfterSecondRes = await app.request("/2026-06-09");
    const itemsAfterSecond = (await itemsAfterSecondRes.json()) as any[];
    expect(itemsAfterSecond.length).toBe(2);
  });

  it("handles multiple dates correctly", async () => {
    await app.request("/2026-06-08/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "email", title: "Yesterday's Email", html: "<p>Old</p>", sourceUrl: "https://example.com/article" }),
    });
    await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "podcast", title: "Today's Podcast", html: "<p>New</p>", sourceUrl: "https://example.com/article" }),
    });
    const datesRes = await app.request("/");
    expect(datesRes.status).toBe(200);
    const dates: string[] = await datesRes.json();
    expect(dates).toEqual(["2026-06-08", "2026-06-09"]);
    const yesterdayItems = (await app.request("/2026-06-08")).json() as Promise<any[]>;
    expect((await yesterdayItems).length).toBe(1);
    const todayItems = (await app.request("/2026-06-09")).json() as Promise<any[]>;
    expect((await todayItems).length).toBe(1);
  });

  it("POST /items — validates input", async () => {
    const res = await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "invalid", title: "", html: "<p>Test</p>", sourceUrl: "https://example.com/article" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({
      error: expect.any(String),
      details: expect.any(Object)
    }));

    const incompleteRes = await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ sourceUrl: "https://example.com/article" }),
    });
    expect(incompleteRes.status).toBe(400);
    const malformedIncompleteBody = await incompleteRes.json();
    expect(malformedIncompleteBody).toEqual(expect.objectContaining({
      error: expect.any(String),
      details: expect.any(Object)
    }));

    const malformedRes = await app.request("/2026-06-09/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: '{"date": "2026-06-09",',
    });
    expect(malformedRes.status).toBe(400);
    const malformedInvalidJsonBody = await malformedRes.json();
    expect(malformedInvalidJsonBody).toEqual(expect.objectContaining({
      error: expect.any(String),
      details: expect.any(Object)
    }));
  });

  it("GET /:date — returns 400 for malformed date strings", async () => {
    const malformedDates = ["not-a-date", "01-01-2026", "2026-6-9"];
    for (const date of malformedDates) {
      const res = await app.request(`/${date}`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    }
  });

  it("CSP header is set", async () => {
    const res = await app.request("/");
    expect(res.headers.get("Content-Security-Policy")).toBe("default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
  });

  it("CORS header is set", async () => {
    const res = await app.request("/", { headers: { origin: "http://localhost:5173" } });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });

  it("POST /:date/items — normalizes sourceUrl without protocol", async () => {
    const res = await app.request("/2026-06-15/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "email", title: "Relative URL", html: "<p>Test</p>", sourceUrl: "example.com/article" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.sourceUrl).toBe("https://example.com/article");
  });

  it("POST /:date/items — preserves sourceUrl with existing protocol", async () => {
    const res = await app.request("/2026-06-15/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ source: "email", title: "Full URL", html: "<p>Test</p>", sourceUrl: "http://custom-proto.com/article" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.sourceUrl).toBe("http://custom-proto.com/article");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/unknown/route");
    expect(res.status).toBe(404);
  });
});
