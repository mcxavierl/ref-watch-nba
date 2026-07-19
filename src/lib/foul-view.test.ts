import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  foulViewQueryValue,
  parseFoulViewParam,
} from "@/lib/foul-view";

describe("foul-view", () => {
  it("parses deep-link view params", () => {
    assert.equal(parseFoulViewParam(null), "all");
    assert.equal(parseFoulViewParam("all"), "all");
    assert.equal(parseFoulViewParam("subjective"), "subjective");
    assert.equal(parseFoulViewParam("admin"), "admin");
    assert.equal(parseFoulViewParam("administrative"), "admin");
  });

  it("omits all from query string values", () => {
    assert.equal(foulViewQueryValue("all"), null);
    assert.equal(foulViewQueryValue("admin"), "admin");
    assert.equal(foulViewQueryValue("subjective"), "subjective");
  });
});
