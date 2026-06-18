import { Context, Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { digestItems } from "../db/schema";
import { DateSchema, CreateItemSchema } from "@daily-digest/shared";
import { InferenceService } from "../services/inference";

export type Source = typeof digestItems.source;

export function createDigestHandler(db: any, inferenceService?: InferenceService) {
  const inf = inferenceService ?? new InferenceService();

  const summarizeItem = async (item: typeof digestItems.$inferInsert, prompt?: string) => {
    if (!inf.isAvailable) {
      console.warn("Summarization requested but inference service not configured");
      return;
    }
    try {
      const summary = await inf.summarize(item.html, prompt);
      await db
        .update(digestItems)
        .set({ summary, summarize: true, summaryPrompt: prompt ?? null })
        .where(eq(digestItems.id, item.id!));
    } catch (err) {
      console.error("Summarization failed for item", item.id, err);
    }
  };

  return {
    upsertItem: async (c: Context) => {
      const dateParam = c.req.param("date");
      const body = await c.req.json().catch(() => ({ "__error__": "invalid_json" }));
      
      if (body.__error__) {
        return c.json({ error: "Invalid JSON", details: { message: "Malformed JSON payload" } }, 400);
      }
  
      if (!dateParam) {
        return c.json({ error: "Invalid request", details: { message: "Date parameter is required in URL" } }, 400);
      }
  
      const parsed = CreateItemSchema.safeParse({
        ...body,
        date: dateParam,
      });
  
      if (!parsed.success) {
        return c.json({ error: "Invalid input", details: parsed.error.format() }, 400);
      }
      const item = parsed.data;

      // Normalize source URL: ensure it has a protocol so the reader resolves it correctly
      if (item.sourceUrl && !item.sourceUrl.startsWith("http://") && !item.sourceUrl.startsWith("https://")) {
        item.sourceUrl = `https://${item.sourceUrl}`;
      }

      const existing = await db
        .select()
        .from(digestItems)
        .where(
          and(
            eq(digestItems.date, item.date),
            eq(digestItems.category, item.category)
          )
        )
        .limit(1);

      let result: any;
      if (existing.length > 0) {
        result = await db
          .update(digestItems)
          .set({
            source: item.source,
            title: item.title,
            html: item.html,
            sourceUrl: item.sourceUrl,
            summarize: item.summarize,
            summaryPrompt: item.summaryPrompt ?? null,
          })
          .where(eq(digestItems.id, existing[0].id))
          .returning();
        result = result[0];
      } else {
        result = await db.insert(digestItems).values(item).returning();
        result = result[0];
      }

      // Async summarization — fire and forget
      if (item.summarize) {
        setImmediate(() => summarizeItem(result, item.summaryPrompt));
      }

      return c.json(result, 201);
    },
    listDates: async (c: Context) => {
      const rows = await db.select({ date: digestItems.date }).from(digestItems).groupBy(digestItems.date).orderBy(digestItems.date);
      return c.json(rows.map((r: any) => r.date));
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
    summarizeItem: async (c: Context) => {
      const dateParam = c.req.param("date");
      const idParam = c.req.param("id");
      const body = await c.req.json().catch(() => ({ "__error__": "invalid_json" }));

      if (body.__error__) {
        return c.json({ error: "Invalid JSON" }, 400);
      }

      const id = parseInt(idParam ?? "", 10);
      if (isNaN(id)) {
        return c.json({ error: "Invalid item ID" }, 400);
      }

      const items = await db
        .select()
        .from(digestItems)
        .where(and(eq(digestItems.id, id), eq(digestItems.date, dateParam!)))
        .limit(1);

      if (items.length === 0) {
        return c.json({ error: "Item not found" }, 404);
      }

      const item = items[0];

      if (!inf.isAvailable) {
        return c.json({ error: "Inference service not configured" }, 503);
      }

      try {
        const prompt = body.prompt || item.summaryPrompt || undefined;
        const summary = await inf.summarize(item.html, prompt);
        await db
          .update(digestItems)
          .set({ summary, summarize: true, summaryPrompt: prompt ?? null })
          .where(eq(digestItems.id, id));

        return c.json({ id: item.id, summary, summarize: true });
      } catch (err: any) {
        return c.json({ error: "Summarization failed", details: err.message }, 500);
      }
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