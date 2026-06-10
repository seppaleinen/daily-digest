import { type Context, Hono } from "hono";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const { drizzle: createDrizzleDb } = await import("drizzle-orm/better-sqlite3");
import { digestItems } from "../db/schema";

import { CreateItemSchema, type Source } from "@daily-digest/shared";
import { eq, and } from "drizzle-orm";

export function createDigestHandler(db: ReturnType<typeof createDrizzleDb>) {
  return {
    upsertItem: async (c: Context) => {
      const body = await c.req.json();

      // Validate input — cast source to Source since it's not typed yet from JSON
      const parsed = CreateItemSchema.safeParse({ ...body, source: body.source as Source });
      if (!parsed.success) {
        return c.json({ error: "Invalid input", details: parsed.error.format() }, 400);
      }

      const item = parsed.data;

      // Check for existing row with same date+title+html
      const existing = await db
        .select()
        .from(digestItems)
        .where(
          and(eq(digestItems.date, item.date), eq(digestItems.title, item.title), eq(digestItems.html, item.html))
        );

       if (existing.length > 0) {
         // Update only the source (in case it was miscategorized)
         const updated = await db.update(digestItems).set({ source: item.source }).where(eq(digestItems.id, existing[0].id)).returning();
         return c.json(updated[0], 201);
       }


      const inserted = await db.insert(digestItems).values(item).returning();
      return c.json(inserted[0], 201);
    },

    listDates: async (c: Context) => {
      const rows = await db.select({ date: digestItems.date }).from(digestItems).orderBy(digestItems.date);
      // Return raw array of strings as requested
      return c.json(rows.map((r) => r.date));
    },

    getItemsByDate: async (c: Context) => {
      const date = c.req.param("date");
      if (!date) return c.json([], 400);
      const rows = await db.select().from(digestItems).where(eq(digestItems.date, date)).orderBy(digestItems.createdAt);
      return c.json(rows);
    },
  };
}

// CSP — block all scripts, inline styles allowed for reader coloring
export function createCspMiddleware() {
  const app = new Hono();
  app.use("*", async (c: Context, next: () => Promise<void>) => {
    c.header("Content-Security-Policy", "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
    await next();
  });

  return app;
}
