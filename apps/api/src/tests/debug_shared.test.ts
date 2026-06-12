import * as Shared from "@daily-digest/shared";
import { DateSchema } from "@daily-digest/shared";

describe("Shared Package Debug", () => {
  it("should have the expected exports", () => {
    console.log("All shared exports:", Shared);
    expect(DateSchema).toBeDefined();
  });
});
