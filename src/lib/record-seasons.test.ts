import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRecordSeasonsForDisplay } from "@/lib/record-seasons";

describe("resolveRecordSeasonsForDisplay", () => {
  const nflMeta = [
    "2000-01",
    "2001-02",
    "2016-17",
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
    "2023-24",
    "2024-25",
    "2025-26",
  ];

  it("caps deep NFL history to the ten-season product window", () => {
    const seasons = resolveRecordSeasonsForDisplay("NFL", nflMeta);
    assert.equal(seasons.length, 10);
    assert.equal(seasons[0], "2016-17");
    assert.equal(seasons[9], "2025-26");
  });

  it("respects a narrower sinceSeason when provided", () => {
    const seasons = resolveRecordSeasonsForDisplay("NFL", nflMeta, "2020-21");
    assert.deepEqual(seasons, [
      "2020-21",
      "2021-22",
      "2022-23",
      "2023-24",
      "2024-25",
      "2025-26",
    ]);
  });

  it("passes through already-scoped season lists", () => {
    const scoped = ["2021-22", "2022-23", "2023-24"];
    assert.deepEqual(resolveRecordSeasonsForDisplay("NFL", scoped), scoped);
  });
});
