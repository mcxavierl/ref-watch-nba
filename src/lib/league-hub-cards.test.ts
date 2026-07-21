import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("league hub cards layout", () => {
  const card = readFileSync("src/components/LeagueHubCard.tsx", "utf8");
  const hubs = readFileSync("src/components/LeagueHubs.tsx", "utf8");

  it("renders accent ribbon and three-zone card layout", () => {
    assert.match(card, /league-hub-card-ribbon/);
    assert.match(card, /min-h-\[260px\]/);
    assert.match(card, /league-hub-card-cta/);
    assert.match(card, /border-t border-slate-800\/60/);
    assert.match(card, /space-y-2/);
  });

  it("uses equal-height grid rows for hub cards", () => {
    assert.match(hubs, /auto-rows-fr/);
    assert.match(hubs, /LeagueHubCard/);
  });
});
