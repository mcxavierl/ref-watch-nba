import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHardTruthSeason,
  resolveRefProfileFoulCategory,
} from "@/lib/analytics/resolve-ref-profile-foul-category";

describe("resolveRefProfileFoulCategory", () => {
  it("treats 2023-2026 seasons as hard truth when direct categories exist", () => {
    const result = resolveRefProfileFoulCategory(
      "nba",
      { totalFouls: 40, subjectiveFlags: 30, administrativeFlags: 10 },
      "2024-25",
    );
    assert.equal(result.source, "direct");
    assert.equal(result.subjective, 30);
    assert.equal(result.administrative, 10);
    assert.equal(isHardTruthSeason("2024-25"), true);
  });

  it("resolves missing categories for 2021-2022 seasons", () => {
    const result = resolveRefProfileFoulCategory(
      "nba",
      { totalFouls: 40 },
      "2021-22",
    );
    assert.equal(result.source, "resolved");
    assert.ok(result.subjective > 0);
    assert.ok(result.administrative >= 0);
    assert.equal(isHardTruthSeason("2021-22"), false);
  });

  it("uses direct categories in legacy seasons when both fields are present", () => {
    const result = resolveRefProfileFoulCategory(
      "nba",
      { totalFouls: 40, subjectiveFlags: 12, administrativeFlags: 8 },
      "2022-23",
    );
    assert.equal(result.source, "direct");
    assert.equal(result.subjective, 12);
    assert.equal(result.administrative, 8);
  });
});
