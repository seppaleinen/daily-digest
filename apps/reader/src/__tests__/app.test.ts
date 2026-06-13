import { describe, it, expect } from "vitest";

describe("App module", () => {
  it("loads without error", async () => {
    const mod = await import("../App");
    expect(mod.default).toBeDefined();
  });
});
