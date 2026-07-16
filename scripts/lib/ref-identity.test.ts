import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { repairRefDisplayName } from "./ref-identity";

describe("repairRefDisplayName", () => {
  it("repairs slug-shaped EPL names via alias map", () => {
    assert.equal(
      repairRefDisplayName("mike-jones-0", "mike-jones-0"),
      "Michael Jones",
    );
  });

  it("leaves proper display names unchanged", () => {
    assert.equal(
      repairRefDisplayName("Anthony Taylor", "anthony-taylor-0"),
      "Anthony Taylor",
    );
  });
});
