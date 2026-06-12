import { describe, it, expect } from "vitest";
import { CreateItemSchema, DateSchema } from "@daily-digest/shared";

describe("Import Test", () => {
  it("should have CreateItemSchema defined", () => {
    console.log("CreateItemSchema:", CreateItemSchema);
    expect(CreateItemSchema).toBeDefined();
  });
  it("should have DateSchema defined", () => {
    console.log("DateSchema:", DateSchema);
    expect(DateSchema).toBeDefined();
  });
});
