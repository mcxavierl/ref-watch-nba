import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDatingBackPhrase,
  formatScopedSeasonYearSpan,
  hubDisplaySeasonScope,
  scopedSeasonDateRange,
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

  it("caps NFL hub hero at default last-10 scope with year span label", () => {
    const nflSeasons = Array.from({ length: 26 }, (_, index) => {
      const start = 2000 + index;
      return `${start}-${String(start + 1).slice(-2)}`;
    });
    const scoped = nflSeasons.slice(-10);
    const { seasonSpan, seasonCount } = hubDisplaySeasonScope("nfl", nflSeasons);
    assert.equal(seasonCount, 10);
    assert.equal(seasonSpan, "2016-2026");
    assert.equal(formatScopedSeasonYearSpan(scoped), "2016-2026");
    assert.deepEqual(scopedSeasonDateRange(scoped), {
      earliest: "2016-09-01",
      latest: "2026-02-28",
    });
  });
});
