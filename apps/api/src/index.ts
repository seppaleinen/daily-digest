import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono, type Context } from "hono";
import { getDb } from "./db";
import { createDigestHandler } from "./routes/digest";
import { InferenceService } from "./services/inference";

const inf = new InferenceService();
const handler = createDigestHandler(getDb(), inf);

const app = new Hono();

// CORS for reader SPA + CSP on all routes
app.use("*", cors());
app.use("*", async (c: Context, next: () => Promise<void>) => {
  c.header("Content-Security-Policy", "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
  await next();
});

// Mount routes
app.post("/digest/:date/items", handler.upsertItem);
app.post("/digest/:date/items/:id/summarize", handler.summarizeItem);
app.get("/digest", handler.listDates);
app.get("/digest/:date", handler.getItemsByDate);

app.all("*", async (c) => {
  return c.text("Not Found", 404);
});

const port = parseInt(process.env.PORT || "3000", 10);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
