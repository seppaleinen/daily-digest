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
  sqlite.pragma("journal_mode=WAL");
  sqlite.pragma("foreign_keys=ON");
  
  // Apply migrations from the drizzle directory
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationPath = path.resolve(__dirname, "../../drizzle/0000_nice_ezekiel.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  sqlite.exec(sql);
  
  const db = createDrizzleDb(sqlite, { schema: { digestItems: schema.digestItems } });
  return { db: db as ReturnType<typeof createDrizzleDb<typeof schema>>, sqlite };
}

async function createApp(db: ReturnType<typeof createDrizzleDb<typeof schema>>) {
  // eslint-disable-next-line @typescript-eslint/no-restricted-imports
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

  app.post("/items", handler.upsertItem);
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
    const createRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "email", title: "Morning Digest", html: "<p>Good morning world</p>" }),
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

    const upsertRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Morning Digest", html: "<p>Good morning world</p>" }),
    });
    expect(upsertRes.status).toBe(201);
    const upserted = (await upsertRes.json()) as any;
    expect(upserted.source).toBe("podcast");

    const itemsAfterUpsertRes = await app.request("/2026-06-09");
    const itemsAfterUpsert = (await itemsAfterUpsertRes.json()) as any[];
    expect(itemsAfterUpsert.length).toBe(1);

    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "youtube", title: "Daily News", html: "<p>News summary</p>" }),
    });
    const itemsAfterSecondRes = await app.request("/2026-06-09");
    const itemsAfterSecond = (await itemsAfterSecondRes.json()) as any[];
    expect(itemsAfterSecond.length).toBe(2);
  });

  it("handles multiple dates correctly", async () => {
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-08", source: "email", title: "Yesterday's Email", html: "<p>Old</p>" }),
    });
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Today's Podcast", html: "<p>New</p>" }),
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
});

describe("digest routes — integration", () => {
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

  it("POST /items — creates a new item", async () => {
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "email", title: "Test email", html: "<p>Hello</p>" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.date).toBe("2026-06-09");
    expect(body.title).toBe("Test email");
  });

  it("POST /items — upserts same date+title+html with different source", async () => {
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "email", title: "Test email", html: "<p>Hello</p>" }),
    });
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Test email", html: "<p>Hello</p>" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.source).toBe("podcast");
  });

  it("POST /items — validates input", async () => {
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "invalid" as any, title: "", html: "" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("details");

    // Incomplete JSON object
    const incompleteRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09" }),
    });
    expect(incompleteRes.status).toBe(400);
    const incompleteBody = await incompleteRes.json();
    expect(incompleteBody).toHaveProperty("error");
    expect(incompleteBody).toHaveProperty("details");

    // Malformed JSON (syntax error)
    const malformedRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: '{"date": "2026-06-09",',
    });
    expect(malformedRes.status).toBe(400);
    const malformedBody = await malformedRes.json();
    expect(malformedBody).toHaveProperty("error");
    expect(malformedBody).toHaveProperty("details");
  });

  it("GET / — lists all dates", async () => {
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-08", source: "email", title: "Yesterday", html: "<p>Old</p>" }),
    });
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Today", html: "<p>New</p>" }),
    });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const dates: string[] = await res.json();
    expect(dates).toEqual(["2026-06-08", "2026-06-09"]);
  });

  it("GET /:date — returns items for a date", async () => {
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "email", title: "First", html: "<p>A</p>" }),
    });
    await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Second", html: "<p>B</p>" }),
    });
    const res = await app.request("/2026-06-09");
    expect(res.status).toBe(200);
    const items = (await res.json()) as any[];
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("First");
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
    expect(res.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'"
    );
  });

  it("CORS header is set", async () => {
    const res = await app.request("/", { headers: { origin: "http://localhost:5173" } });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });
});
