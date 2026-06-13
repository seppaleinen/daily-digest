import { describe, it, expect, vi, beforeEach } from "vitest";

describe("DigestApiService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs with default baseUrl from env", async () => {
    process.env.DIGEST_API_URL = "http://localhost:3000";
    const { DigestApiService } = await import("../digest-api.service");
    const svc = new DigestApiService();
    expect(svc).toBeInstanceOf(DigestApiService);
    delete process.env.DIGEST_API_URL;
  });

  it("throws when DIGEST_API_URL is not defined", async () => {
    delete process.env.DIGEST_API_URL;
    const { DigestApiService } = await import("../digest-api.service");
    expect(() => new DigestApiService()).toThrow("DIGEST_API_URL is not defined");
  });

  it("uses provided baseUrl instead of env", async () => {
    const { DigestApiService } = await import("../digest-api.service");
    const svc = new DigestApiService("http://test:9999");
    const called: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      called.push(url);
      return Promise.resolve(new Response("ok", { status: 201 }));
    });
    await svc.pushDigestItem("2026-06-15", {
      source: "email",
      title: "Test",
      html: "<p>Hi</p>",
      sourceUrl: "https://example.com",
    });
    expect(called[0]).toBe("http://test:9999/digest/2026-06-15/items");
  });

  it("sends correct payload shape", async () => {
    const { DigestApiService } = await import("../digest-api.service");
    const svc = new DigestApiService("http://localhost:3000");
    let sentBody: string | undefined;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      sentBody = opts.body as string;
      return Promise.resolve(new Response("ok", { status: 201 }));
    });
    await svc.pushDigestItem("2026-06-15", {
      source: "email",
      title: "Test Title",
      html: "<p>Content</p>",
      sourceUrl: "https://example.com/article",
    });
    const body = JSON.parse(sentBody!);
    expect(body).toEqual({
      source: "email",
      title: "Test Title",
      html: "<p>Content</p>",
      sourceUrl: "https://example.com/article",
    });
  });

  it("throws on non-OK response", async () => {
    const { DigestApiService } = await import("../digest-api.service");
    const svc = new DigestApiService("http://localhost:3000");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Bad Request", { status: 400 }),
    );
    await expect(
      svc.pushDigestItem("2026-06-15", {
        source: "email",
        title: "Test",
        html: "<p>Hi</p>",
        sourceUrl: "https://example.com",
      }),
    ).rejects.toThrow("Failed to push digest item: Bad Request");
  });
});
