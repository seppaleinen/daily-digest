import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono, type Context } from "hono";
import { getDb } from "./db";
import { createDigestHandler } from "./routes/digest";

const handler = createDigestHandler(getDb());

const app = new Hono();

// CORS for reader SPA + CSP on all routes
app.use("*", cors());
app.use("*", async (c: Context, next: () => Promise<void>) => {
  c.header("Content-Security-Policy", "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
  await next();
});

// Mount routes under /digest prefix
app.post("/items", handler.upsertItem);
app.get("/", handler.listDates);
app.get("/:date", handler.getItemsByDate);

const port = parseInt(process.env.PORT || "3000", 10);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
