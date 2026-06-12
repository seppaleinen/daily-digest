import { DateSchema } from "../../packages/shared/src/schemas";
import { CreateItemSchema } from "../../packages/shared/src/schemas";

describe("Direct Path Debug", () => {
  it("should have the expected exports via direct path", () => {
    console.log("Direct DateSchema:", DateSchema);
    console.log("Direct CreateItemSchema:", CreateItemSchema);
    expect(DateSchema).toBeDefined();
  });
});
