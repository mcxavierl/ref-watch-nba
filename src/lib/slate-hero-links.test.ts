import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scopeParamForSeasonCount,
  slateHeroActions,
  slateHeroStatHref,
} from "@/lib/slate-hero-links";

describe("slate-hero-links", () => {
  it("maps hero stats to league-scoped destinations", () => {
    assert.equal(slateHeroStatHref("nba", "officials"), "/refs");
    assert.equal(slateHeroStatHref("nba", "games"), "/matrix");
    assert.equal(slateHeroStatHref("nba", "seasons", 10), "/trends?scope=last10");
    assert.equal(slateHeroStatHref("laliga", "officials"), "/laliga/refs");
    assert.equal(slateHeroStatHref("laliga", "games"), "/laliga/matrix");
    assert.equal(slateHeroStatHref("laliga", "seasons", 5), "/laliga/trends?scope=last5");
    assert.equal(slateHeroStatHref("nfl", "seasons", 26), "/nfl/trends");
  });

  it("builds league-scoped hero action chips", () => {
    const nba = slateHeroActions("nba");
    assert.equal(nba[0]?.href, "/rankings");
    assert.equal(nba[1]?.href, "/matrix");

    const laliga = slateHeroActions("laliga");
    assert.equal(laliga[0]?.href, "/laliga/rankings");
    assert.equal(laliga[2]?.href, "/laliga/teams");
    assert.equal(laliga[3]?.href, "#dataset-findings");
  });

  it("derives scope params from visible season counts", () => {
    assert.equal(scopeParamForSeasonCount(1), "current");
    assert.equal(scopeParamForSeasonCount(5), "last5");
    assert.equal(scopeParamForSeasonCount(10), "last10");
    assert.equal(scopeParamForSeasonCount(26), null);
  });
});
