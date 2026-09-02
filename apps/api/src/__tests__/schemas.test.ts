import { describe, it, expect } from "vitest";
import { CreateItemSchema, DateSchema } from "@daily-digest/shared";

describe("DateSchema", () => {
  it("accepts valid ISO dates", () => {
    expect(DateSchema.safeParse("2026-01-01").success).toBe(true);
    expect(DateSchema.safeParse("2026-12-31").success).toBe(true);
    expect(DateSchema.safeParse("2000-02-29").success).toBe(true); // leap year
  });

  it("rejects non-ISO date formats", () => {
    // Wrong separators
    expect(DateSchema.safeParse("2026/01/01").success).toBe(false);
    expect(DateSchema.safeParse("2026.01.01").success).toBe(false);
    expect(DateSchema.safeParse("01-01-2026").success).toBe(false);

    // Missing leading zeros
    expect(DateSchema.safeParse("2026-1-1").success).toBe(false);
    expect(DateSchema.safeParse("2026-6-9").success).toBe(false);

    // ISO with time component
    expect(DateSchema.safeParse("2026-01-01T00:00:00Z").success).toBe(false);
    expect(DateSchema.safeParse("2026-01-01T12:30:00").success).toBe(false);

    // Completely invalid
    expect(DateSchema.safeParse("not-a-date").success).toBe(false);
    expect(DateSchema.safeParse("").success).toBe(false);
    expect(DateSchema.safeParse("2026").success).toBe(false);
    expect(DateSchema.safeParse("2026-01").success).toBe(false);
  });
});

describe("CreateItemSchema", () => {
  const validItem = {
    date: "2026-06-09",
    source: "email",
    title: "Test Title",
    html: "<p>Content</p>",
    sourceUrl: "https://example.com/article",
  };

  it("accepts a valid minimal item", () => {
    const result = CreateItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("general"); // default
      expect(result.data.summarize).toBe(false); // default
    }
  });

  describe("date validation", () => {
    it("rejects invalid date formats", () => {
      const invalidDates = [
        "09-06-2026",
        "2026/06/09",
        "2026-6-9",
        "not-a-date",
        "20260609",
        "",
      ];
      for (const date of invalidDates) {
        const result = CreateItemSchema.safeParse({ ...validItem, date });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("source validation", () => {
    it("accepts valid source values", () => {
      const sources = ["email", "podcast", "youtube"] as const;
      for (const source of sources) {
        const result = CreateItemSchema.safeParse({ ...validItem, source });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid source values", () => {
      const invalidSources = ["twitter", "rss", "blog", "RSS", "Email", ""];
      for (const source of invalidSources) {
        const result = CreateItemSchema.safeParse({ ...validItem, source });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("title validation", () => {
    it("accepts titles within bounds (1-500 chars)", () => {
      const shortTitle = "A";
      const longTitle = "A".repeat(500);
      expect(CreateItemSchema.safeParse({ ...validItem, title: shortTitle }).success).toBe(true);
      expect(CreateItemSchema.safeParse({ ...validItem, title: longTitle }).success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects title exceeding 500 chars", () => {
      const tooLong = "A".repeat(501);
      const result = CreateItemSchema.safeParse({ ...validItem, title: tooLong });
      expect(result.success).toBe(false);
    });
  });

  describe("category validation", () => {
    it("defaults to 'general' when not provided", () => {
      const result = CreateItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe("general");
      }
    });

    it("accepts custom category within bounds (1-50 chars)", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, category: "news" });
      expect(result.success).toBe(true);
    });

    it("rejects empty category", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, category: "" });
      expect(result.success).toBe(false);
    });

    it("rejects category exceeding 50 chars", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, category: "A".repeat(51) });
      expect(result.success).toBe(false);
    });
  });

  describe("summarize validation", () => {
    it("defaults to false when not provided", () => {
      const result = CreateItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summarize).toBe(false);
      }
    });

    it("accepts boolean true", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, summarize: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summarize).toBe(true);
      }
    });
  });

  describe("summaryPrompt validation", () => {
    it("allows undefined summaryPrompt", () => {
      const result = CreateItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summaryPrompt).toBeUndefined();
      }
    });

    it("accepts a string summaryPrompt", () => {
      const result = CreateItemSchema.safeParse({ ...validItem, summarize: true, summaryPrompt: "Summarize in 3 bullet points" });
      expect(result.success).toBe(true);
    });
  });

  describe("missing required fields", () => {
    it("rejects when date is missing", () => {
      const { date, ...rest } = validItem;
      const result = CreateItemSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when source is missing", () => {
      const { source, ...rest } = validItem;
      const result = CreateItemSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when title is missing", () => {
      const { title, ...rest } = validItem;
      const result = CreateItemSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when html is missing", () => {
      const { html, ...rest } = validItem;
      const result = CreateItemSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when sourceUrl is missing", () => {
      const { sourceUrl, ...rest } = validItem;
      const result = CreateItemSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects completely empty object", () => {
      const result = CreateItemSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
