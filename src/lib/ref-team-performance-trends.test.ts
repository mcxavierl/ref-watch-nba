import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefTeamPerformanceTrends } from "@/lib/ref-team-performance-trends";
import type { RefProfile } from "@/lib/types";

describe("ref-team-performance-trends", () => {
  it("ranks teams by ATS cover rate when lined sample is adequate", () => {
    const profile = {
      teamStats: {
        KC: {
          games: 12,
          avgFoulDifferential: 0,
          avgTotalPoints: 45,
          overRate: 0.5,
          winRate: 0.58,
          atsWins: 9,
          atsLosses: 3,
          atsPushes: 0,
          atsGames: 12,
          atsCoverRate: 0.75,
        },
        DEN: {
          games: 10,
          avgFoulDifferential: 0,
          avgTotalPoints: 42,
          overRate: 0.5,
          winRate: 0.4,
          atsWins: 3,
          atsLosses: 7,
          atsPushes: 0,
          atsGames: 10,
          atsCoverRate: 0.3,
        },
        BUF: {
          games: 4,
          avgFoulDifferential: 0,
          avgTotalPoints: 44,
          overRate: 0.5,
          winRate: 0.5,
          atsWins: 2,
          atsLosses: 2,
          atsPushes: 0,
          atsGames: 4,
          atsCoverRate: 0.5,
        },
      },
    } satisfies Pick<RefProfile, "teamStats">;

    const { best, worst } = buildRefTeamPerformanceTrends(profile, 3);
    assert.equal(best[0]?.abbr, "KC");
    assert.equal(worst[0]?.abbr, "DEN");
    assert.equal(best.some((row) => row.abbr === "BUF"), false);
  });
});
