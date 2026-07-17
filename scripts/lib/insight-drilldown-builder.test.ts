import assert from "node:assert/strict";
import { test } from "node:test";
import overviewInsightsJson from "../../data/overview-insights.json";
import type { LeagueInsightCard } from "../../src/lib/league-overview-insights";
import type { LeagueId } from "../../src/lib/leagues";
import { buildInsightDrilldownPayload } from "./insight-drilldown-builder";

const cards = (overviewInsightsJson as { cards: LeagueInsightCard[] }).cards ?? [];

function pickMatrixCard(leagueId: LeagueId): LeagueInsightCard | undefined {
  return cards.find(
    (card) =>
      card.leagueId === leagueId &&
      card.kind === "matrix-edge" &&
      Boolean(card.refSlug) &&
      Boolean(card.teamAbbr),
  );
}

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

test("NBA matrix drill-down uses verified game logs when available", () => {
  const nbaCard = pickMatrixCard("nba");
  assert.ok(
    nbaCard,
    "overview-insights.json must include at least one NBA matrix-edge card",
  );
  const payload = buildInsightDrilldownPayload(process.cwd(), nbaCard!);
  assert.ok(payload);
  assert.ok(payload.games.length > 0);
  const recordGames = payload.wins + payload.losses;
  if (recordGames >= 8) {
    assert.ok(
      payload.games.length >= 8,
      `expected at least 8 ${nbaCard!.teamAbbr} games in drill-down, got ${payload.games.length}`,
    );
  }
});
