import assert from "node:assert/strict";
import { test } from "node:test";
import overviewInsightsJson from "../../data/overview-insights.json";
import type { LeagueInsightCard } from "../../src/lib/league-overview-insights";
import { buildInsightDrilldownPayload } from "./insight-drilldown-builder";

const cards = (overviewInsightsJson as { cards: LeagueInsightCard[] }).cards ?? [];

test("overview drill-down shards include game rows for every live league", () => {
  for (const card of cards) {
    const payload = buildInsightDrilldownPayload(process.cwd(), card);
    assert.ok(payload, `missing payload for ${card.leagueId}`);
    assert.ok(
      payload.games.length > 0,
      `${card.leagueId} drill-down ${payload.drilldownId} has no games`,
    );
  }
});

test("NBA Schwab drill-down uses verified game logs when available", () => {
  const nbaCard = cards.find((card) => card.refSlug === "brandon-schwab-86");
  assert.ok(nbaCard);
  const payload = buildInsightDrilldownPayload(process.cwd(), nbaCard!);
  assert.ok(payload);
  assert.ok(payload.games.length > 0);
  const recordGames = payload.wins + payload.losses;
  if (recordGames >= 8) {
    assert.ok(
      payload.games.length >= 8,
      `expected at least 8 SAC games in drill-down, got ${payload.games.length}`,
    );
  }
});
