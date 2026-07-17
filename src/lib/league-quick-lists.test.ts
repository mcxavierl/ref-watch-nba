import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { overviewQuickListsForLeague } from "@/lib/league-quick-lists";

describe("overviewQuickListsForLeague", () => {
  it("shows CBB home bias preview when insight hero is unavailable", () => {
    const lists = overviewQuickListsForLeague("cbb", {});
    const homeBias = lists.find((list) => list.id === "home-bias");
    assert.ok(homeBias);
    assert.equal(homeBias.preview.value, "+1.2%");
    assert.equal(homeBias.preview.caption, "Cover Δ");
  });
});
