import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferNflSeason } from "./espn";
import { normalizeEspnAbbr } from "./espn";

describe("normalizeEspnAbbr", () => {
  it("maps historical relocation abbreviations", () => {
    assert.equal(normalizeEspnAbbr("SD"), "LAC");
    assert.equal(normalizeEspnAbbr("OAK"), "LV");
    assert.equal(normalizeEspnAbbr("WSH"), "WAS");
  });
});

describe("inferNflSeason", () => {
  it("assigns Jan/Feb games to the prior start year", () => {
    assert.equal(inferNflSeason("2025-01-12"), "2024-25");
    assert.equal(inferNflSeason("2026-02-08"), "2025-26");
    assert.equal(inferNflSeason("2017-02-05"), "2016-17");
  });

  it("assigns Sep–Dec games to the calendar start year", () => {
    assert.equal(inferNflSeason("2025-09-07"), "2025-26");
    assert.equal(inferNflSeason("2024-12-25"), "2024-25");
    assert.equal(inferNflSeason("2017-09-10"), "2017-18");
  });
});
