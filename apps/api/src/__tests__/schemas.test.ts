import { describe, it, expect } from "vitest";
import { CreateItemSchema, SOURCE } from "@daily-digest/shared";
import type { Source } from "@daily-digest/shared";

describe("CreateItemSchema — unit", () => {
  it("validates email source with all required fields", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Body</p>" });
    expect(result.success).toBe(true);
  });

  it("validates podcast and youtube sources", () => {
    const result1 = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[1], title: "Podcast Episode", html: "<p>Transcript</p>" });
    expect(result1.success).toBe(true);

    const result2 = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[2], title: "Video Title", html: "<p>Description</p>" });
    expect(result2.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0] as Source, title: "", html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });

  it("rejects missing source field", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", title: "Subject", html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source value", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: "invalid" as Source, title: "Subject", html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });

  it("rejects missing date field", () => {
    const result = CreateItemSchema.safeParse({ source: SOURCE[0], title: "Subject", html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });

  it("allows empty HTML (for markdown or plain text)", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "" });
    expect(result.success).toBe(true);
  });

  it("accepts HTML with script tags (sanitized client-side)", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "Subject", html: "<p>Hello</p><script>alert('xss')</script>" });
    expect(result.success).toBe(true);
  });

  it("rejects title over 500 chars", () => {
    const result = CreateItemSchema.safeParse({ date: "2026-06-09", source: SOURCE[0], title: "a".repeat(501), html: "<p>Body</p>" });
    expect(result.success).toBe(false);
  });
});

describe("Source enum — unit", () => {
  it("contains exactly email, podcast, youtube", () => {
    expect(SOURCE).toEqual(["email", "podcast", "youtube"]);
  });
});
