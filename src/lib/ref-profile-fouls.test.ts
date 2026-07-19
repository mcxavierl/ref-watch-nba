import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterRefProfileFouls,
  getFoulCategoryDisplay,
  resolveRefProfileFoulCategory,
} from "@/lib/ref-profile-fouls";
import { FoulCategory } from "@/lib/types/foul-categories";

const sampleFouls = [
  {
    id: "1",
    label: "Delay of Game",
    gameId: "g1",
    date: "2024-09-08",
    matchup: "BAL @ KC",
    category: FoulCategory.ADMIN,
  },
  {
    id: "2",
    label: "Defensive Holding",
    gameId: "g1",
    date: "2024-09-08",
    matchup: "BAL @ KC",
    category: FoulCategory.SUBJECTIVE,
  },
  {
    id: "3",
    label: "Unknown Historical",
    gameId: "g2",
    date: "2024-09-15",
    matchup: "NYJ @ TEN",
  },
];

describe("ref-profile-fouls", () => {
  it("defaults missing categories to subjective", () => {
    assert.equal(
      resolveRefProfileFoulCategory(undefined),
      FoulCategory.SUBJECTIVE,
    );
    assert.equal(
      getFoulCategoryDisplay({ category: undefined }),
      FoulCategory.SUBJECTIVE,
    );
  });

  it("filters admin and subjective views with computed defaults", () => {
    assert.equal(filterRefProfileFouls(sampleFouls, "all").length, 3);
    assert.equal(filterRefProfileFouls(sampleFouls, "admin").length, 1);
    assert.equal(filterRefProfileFouls(sampleFouls, "subjective").length, 2);
  });
});
