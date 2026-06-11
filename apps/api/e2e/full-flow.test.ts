import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const { drizzle: createDrizzleDb } = await import("drizzle-orm/better-sqlite3");
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const Database = (await import("better-sqlite3")).default;
import * as schema from "../src/db/schema";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const TEST_DB_PATH = path.join(process.cwd(), "test_e2e.db");

function createDb() {
  const sqlite = new Database(TEST_DB_PATH);
  sqlite.pragma("journal_mode=WAL");
  sqlite.pragma("foreign_keys=ON");
  return { db: createDrizzleDb(sqlite, { schema }) as ReturnType<typeof createDrizzleDb<typeof schema>>, sqlite };
}

async function createApp(db: ReturnType<typeof createDrizzleDb<typeof schema>>) {
  const { Hono } = await import("hono");
  const { createDigestHandler } = await import("../src/routes/digest");

  const handler = createDigestHandler(db);
  const app = new Hono();

  app.post("/items", handler.upsertItem);
  app.get("/", handler.listDates);
  app.get("/:date", handler.getItemsByDate);

  return app;
}

describe("full flow — e2e", () => {
  let db: ReturnType<typeof createDrizzleDb<typeof schema>>;
  let app: Awaited<ReturnType<typeof createApp>>;
  let sqlite: Database;

  beforeAll(() => {
    // No-op or setup global resources
  });

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Run migrations/push to create tables
    execSync(`npx drizzle-kit push --schema ./src/db/schema.ts --dialect sqlite --url ${TEST_DB_PATH}`, { stdio: 'inherit' });
    
    const result = createDb();
    db = result.db;
    sqlite = result.sqlite;
    app = await createApp(db);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("creates item, reads date list, reads items by date — full flow", async () => {
    // Step 1: Create an email item for today
    const createRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "email", title: "Morning Digest", html: "<p>Good morning world</p>" }),
    });
    expect(createRes.status).toBe(201);
    const item = (await createRes.json()) as any;
    expect(item.source).toBe("email");
    expect(item.title).toBe("Morning Digest");

    // Step 2: Verify the date appears in the list
    const datesRes = await app.request("/");
    expect(datesRes.status).toBe(200);
    const dates: string[] = await datesRes.json();
    expect(dates).toContain("2026-06-09");

    // Step 3: Verify the item appears when fetching by date
    const itemsRes = await app.request("/2026-06-09");
    expect(itemsRes.status).toBe(200);
    const items = (await itemsRes.json()) as any[];
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Morning Digest");

    // Step 4: Upsert — same date+title+html, different source should update
    const upsertRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: "2026-06-09", source: "podcast", title: "Morning Digest", html: "<p>Good morning world</p>" }),
    });
    expect(upsertRes.status).toBe(201);
    const upserted = (await upsertRes.json()) as any;
    expect(upserted.source).toBe("podcast"); // source updated

    // Step 5: Still only one item for that date
    const itemsAfterUpsertRes = await app.request("/2026-06-09");
    const itemsAfterUpsert = (await itemsAfterUpsertRes.json()) as any[];
    expect(itemsAfterUpsert.length).toBe(1);

    // Step 6: Add a different item for the same date
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
    // Create items for two different dates
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

    // Verify dates list returns both, sorted ascending
    const datesRes = await app.request("/");
    expect(datesRes.status).toBe(200);
    const dates: string[] = await datesRes.json();
    expect(dates).toEqual(["2026-06-08", "2026-06-09"]);

    // Verify each date returns only its own items
    const yesterdayItems = (await app.request("/2026-06-08")).json() as Promise<any[]>;
    expect((await yesterdayItems).length).toBe(1);
    expect((await yesterdayItems)[0].title).toBe("Yesterday's Email");

    const todayItems = (await app.request("/2026-06-09")).json() as Promise<any[]>;
    expect((await todayItems).length).toBe(1);
    expect((await todayItems)[0].title).toBe("Today's Podcast");
  });

  it("persists data across application restarts", async () => {
    const testDate = "2026-06-10";
    const testTitle = "Persistence Test";

    // Step 1: Create item
    const createRes = await app.request("/items", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ date: testDate, source: "email", title: testTitle, html: "<p>Test</p>" }),
    });
    expect(createRes.status).toBe(201);

    // Step 2: Close connection
    sqlite.close();

    // Step 3: Re-connect
    const result = createDb();
    db = result.db;
    sqlite = result.sqlite;
    app = await createApp(db);

    // Step 4: Verify data
    const itemsRes = await app.request(`/${testDate}`);
    expect(itemsRes.status).toBe(200);
    const items = (await itemsRes.json()) as any[];
    expect(items.length).toBe(1);
    expect(items[0].title).toBe(testTitle);
  });
});
