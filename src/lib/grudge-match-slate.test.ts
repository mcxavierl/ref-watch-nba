import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSlateGames } from "@/lib/grudge-match";
import type { AssignmentsFile } from "@/lib/types";

describe("resolveSlateGames", () => {
  it("returns scheduled games when crews are not published yet", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-08T04:01:07.016Z",
      date: "2026-08-06",
      source: "espn",
      games: [],
      scheduledGames: [
        {
          id: "401772971",
          matchup: "LAC @ DET",
          awayTeam: "LAC",
          homeTeam: "DET",
          league: "NFL",
          crew: [],
        },
      ],
      nextSlateDate: "2026-08-06",
    };

    const { games, isPreview } = resolveSlateGames(file);

    assert.equal(games.length, 1);
    assert.equal(games[0]?.matchup, "LAC @ DET");
    assert.equal(isPreview, true);
  });

  it("prefers live crew games over scheduled placeholders", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-08T04:01:07.016Z",
      date: "2026-08-06",
      source: "espn",
      games: [
        {
          id: "live-1",
          matchup: "KC @ BUF",
          awayTeam: "KC",
          homeTeam: "BUF",
          league: "NFL",
          crew: [{ name: "John Smith", number: 1, role: "referee" }],
        },
      ],
      scheduledGames: [
        {
          id: "401772971",
          matchup: "LAC @ DET",
          awayTeam: "LAC",
          homeTeam: "DET",
          league: "NFL",
          crew: [],
        },
      ],
    };

    const { games, isPreview } = resolveSlateGames(file);

    assert.equal(games.length, 1);
    assert.equal(games[0]?.matchup, "KC @ BUF");
    assert.equal(isPreview, false);
  });
});
