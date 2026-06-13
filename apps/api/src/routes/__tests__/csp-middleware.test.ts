import { describe, it, expect } from "vitest";
import { createCspMiddleware } from "../digest";

describe("createCspMiddleware", () => {
  const cspValue = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'";

  it("returns a Hono app", () => {
    const app = createCspMiddleware();
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("sets Content-Security-Policy header on every response", async () => {
    const app = createCspMiddleware();
    app.get("/test", (c) => c.text("ok"));
    const res = await app.request("/test");
    expect(res.headers.get("Content-Security-Policy")).toBe(cspValue);
  });

  it("sets CSP header on 404 responses", async () => {
    const app = createCspMiddleware();
    const res = await app.request("/nonexistent");
    expect(res.headers.get("Content-Security-Policy")).toBe(cspValue);
  });

  it("sets CSP header on POST responses", async () => {
    const app = createCspMiddleware();
    app.post("/submit", (c) => c.json({ ok: true }));
    const res = await app.request("/submit", { method: "POST" });
    expect(res.headers.get("Content-Security-Policy")).toBe(cspValue);
  });

  it("does not block downstream response body", async () => {
    const app = createCspMiddleware();
    app.get("/hello", (c) => c.text("world"));
    const res = await app.request("/hello");
    const body = await res.text();
    expect(body).toBe("world");
  });
});
