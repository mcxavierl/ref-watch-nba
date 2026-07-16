import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDatingBackPhrase,
  hubDisplaySeasonScope,
} from "@/lib/season-scope";

describe("season-scope", () => {
  it("formats dating-back hero copy from scoped seasons", () => {
    assert.equal(
      formatDatingBackPhrase([
        "2016-17",
        "2017-18",
        "2018-19",
        "2025-26",
      ]),
      "dating back to 2016",
    );
    assert.equal(formatDatingBackPhrase(["2025-26"]), "for the 2025-26 season");
    assert.equal(formatDatingBackPhrase([]), "with limited history");
  });

  it("caps NFL hub hero at default last-10 scope", () => {
    const nflSeasons = Array.from({ length: 26 }, (_, index) => {
      const start = 2000 + index;
      return `${start}-${String(start + 1).slice(-2)}`;
    });
    const { seasonSpan, seasonCount } = hubDisplaySeasonScope("nfl", nflSeasons);
    assert.equal(seasonCount, 10);
    assert.equal(seasonSpan, "Last 10 seasons");
  });
});
