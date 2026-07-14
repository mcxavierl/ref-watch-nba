import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countCurrentSeasonGames, meetsCfbGameLogThreshold } from "./threshold";

describe("cfb game log threshold", () => {
  const logs = [
    { season: "2025-26" },
    { season: "2025-26" },
    { season: "2024-25" },
  ];

  it("counts only the requested season", () => {
    assert.equal(countCurrentSeasonGames(logs, "2025-26"), 2);
    assert.equal(countCurrentSeasonGames(logs, "2024-25"), 1);
  });

  it("evaluates threshold against current season count", () => {
    const below = meetsCfbGameLogThreshold(logs, 80, "2025-26");
    assert.equal(below.currentSeasonCount, 2);
    assert.equal(below.meetsThreshold, false);

    const above = meetsCfbGameLogThreshold(
      Array.from({ length: 80 }, () => ({ season: "2025-26" })),
      80,
      "2025-26",
    );
    assert.equal(above.meetsThreshold, true);
  });
});
