import { describe, it, expect } from "vitest";
import { CreateItemSchema, SOURCE } from "@daily-digest/shared";
import type { Source } from "@daily-digest/shared";

const TEST_SOURCE_URL = "https://example.com/article";

describe("CreateItemSchema — unit", () => {
  it("validates email source with all required fields", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(true);
  });

  it("validates podcast and youtube sources", () => {
    const result1 = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[1], title: "Podcast Episode", html: "<p>Transcript</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result1.success).toBe(true);

    const result2 = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[2], title: "Video Title", html: "<p>Description</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result2.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0] as Source, title: "", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(false);
  });

  it("rejects missing source field", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", title: "Subject", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source value", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: "invalid" as Source, title: "Subject", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(false);
  });

  it("rejects missing date field", () => {
    const result = CreateItemSchema.safeParse({ source: SOURCE[0], title: "Subject", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(false);
  });

  it("allows empty HTML (for markdown or plain text)", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(true);
  });

  it("accepts HTML with script tags (sanitized client-side)", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Hello</p><script>alert('xss')</script>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(true);
  });

  it("rejects title over 500 chars", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "a".repeat(501), html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date formats", () => {
    const invalidDates = ["2026/06/09", "09-06-2026", "2026-6-9", "not-a-date"];
    invalidDates.forEach(date => {
      const result = CreateItemSchema.safeParse({ date, source: SOURCE[0], title: "Subject", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
      expect(result.success).toBe(false);
    });
  });

  it("validates title length boundaries", () => {
    const minRes = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "a", html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(minRes.success).toBe(true);

    const maxRes = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "a".repeat(500), html: "<p>Body</p>", sourceUrl: TEST_SOURCE_URL });
    expect(maxRes.success).toBe(true);
  });

  it("rejects missing sourceUrl", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });

  it("accepts any non-empty string for sourceUrl (no URL format validation)", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Body</p>", sourceUrl: "/relative/path" });
    expect(result.success).toBe(true);
  });
});

describe("Source enum — unit", () => {
  it("contains exactly email, podcast, youtube", () => {
    expect(SOURCE).toEqual(["email", "podcast", "youtube"]);
  });
});
