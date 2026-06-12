import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { digestItems } from "../db/schema";
import { DateSchema, CreateItemSchema } from "@daily-digest/shared";

export type Source = typeof digestItems.source;

export function createDigestHandler(db: any) {
  return {
    upsertItem: async (c: Context) => {
      const body = await c.req.json().catch(() => ({ "__error__": "invalid_json" }));
      if (body.__error__) {
        return c.json({ error: "Invalid JSON", details: { message: "Malformed JSON payload" } }, 400);
      }
      const parsed = CreateItemSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "Invalid input", details: parsed.error.format() }, 400);
      }
      const item = parsed.data;

      const existing = await db
        .select()
        .from(digestItems)
        .where(
          and(
            eq(digestItems.date, item.date),
            eq(digestItems.category, item.category),
            eq(digestItems.title, item.title),
            eq(digestItems.html, item.html)
          )
        );

      if (existing.length > 0) {
        const updated = await db.update(digestItems).set({ source: item.source }).where(eq(digestItems.id, existing[0].id)).returning();
        return c.json(updated[0], 201);
      }

      const inserted = await db.insert(digestItems).values(item).returning();
      return c.json(inserted[0], 201);
    },
    listDates: async (c: Context) => {
      const rows = await db.select({ date: digestItems.date }).from(digestItems).groupBy(digestItems.date).orderBy(digestItems.date);
      return c.json(rows.map((r) => r.date));
    },
    getItemsByDate: async (c: Context) => {
      const date = c.req.param("date");
      const category = c.req.query("category");
      if (!date) return c.json([], 400);

      const validation = DateSchema.safeParse(date);
      if (!validation.success) {
        return c.json({ error: "Invalid date format. Expected YYYY-MM-DD", details: validation.error.format() }, 400);
      }

      const filters = [eq(digestItems.date, date)];
      if (category) {
        filters.push(eq(digestItems.category, category));
      }

      const rows = await db
        .select()
        .from(digestItems)
        .where(and(...filters))
        .orderBy(digestItems.createdAt);

      return c.json(rows);
    },
  };
}

export function createCspMiddleware() {
  const app = new Hono();
  app.use("*", async (c: Context, next: () => Promise<void>) => {
    c.header("Content-Security-Policy", "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
    await next();
  });
  return app;
}
