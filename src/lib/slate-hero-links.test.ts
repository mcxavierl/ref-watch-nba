import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scopeParamForSeasonCount,
  slateHeroActions,
  slateHeroStatHref,
} from "@/lib/slate-hero-links";

describe("slate-hero-links", () => {
  it("maps hero stats to league-scoped destinations", () => {
    assert.equal(slateHeroStatHref("nba", "officials"), "/nba/refs");
    assert.equal(slateHeroStatHref("nba", "games"), "/nba/matrix");
    assert.equal(slateHeroStatHref("nba", "seasons", 10), "/nba/research/trends?scope=last10");
    assert.equal(slateHeroStatHref("laliga", "officials"), "/laliga/refs");
    assert.equal(slateHeroStatHref("laliga", "games"), "/laliga/matrix");
    assert.equal(slateHeroStatHref("laliga", "seasons", 5), "/laliga/research/trends?scope=last5");
    assert.equal(slateHeroStatHref("nfl", "seasons", 10), "/nfl/research/trends?scope=last10");
  });

  it("builds league-scoped hero action chips", () => {
    const nba = slateHeroActions("nba");
    assert.equal(nba[0]?.href, "/nba/research/tendencies");
    assert.equal(nba[1]?.href, "/nba/matrix");

    const laliga = slateHeroActions("laliga");
    assert.equal(laliga[0]?.href, "/laliga/research/tendencies");
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
