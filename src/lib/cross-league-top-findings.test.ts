import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCrossLeagueTopFindingCards } from "@/lib/cross-league-top-findings";

test("buildCrossLeagueTopFindingCards returns one card per pro league when data exists", () => {
  const cards = buildCrossLeagueTopFindingCards();
  assert.ok(cards.length > 0);
  assert.ok(cards.length <= 5);
  const leagues = new Set(cards.map((card) => card.leagueId));
  assert.equal(leagues.size, cards.length);
});
