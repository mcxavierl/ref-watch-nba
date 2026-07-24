import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { clearRuntimeGameLogsModuleCache } from "@/lib/game-logs";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import { getLiveSlateGames } from "@/lib/live-slate-engine";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { collectLeagueSlateEntries } from "@/lib/overview-upcoming-slate";
import { mergeLiveSlateGamesWithSeed } from "@/lib/merge-slate-historical-context";
import {
  buildHistoricalMatchupBaseline,
  PENDING_EMPTY_H2H_COPY,
} from "@/lib/slate-intelligence";
import type { AssignmentsFile } from "@/lib/types";

describe("homepage slate head-to-head seed", () => {
  it("merges bundled snapshot context over worker-style live rebuilds", () => {
    const snapshot = loadOverviewSnapshot();
    const seedGames = snapshot.upcomingSlate.games ?? [];
    assert.ok(seedGames.length > 0, "snapshot should ship slate games");

    const degradedLiveGames = seedGames.map((game) => ({
      ...game,
      preview: game.preview
        ? {
            ...game.preview,
            sampleGames: 0,
            matchupBriefing: {
              headline: `${game.awayTeam} at ${game.homeTeam} matchup sheet`,
              lines: [PENDING_EMPTY_H2H_COPY],
              h2hGames: 0,
              avgTotalPoints: 0,
              avgFouls: 0,
              overRate: 0.5,
            },
          }
        : game.preview,
    }));

    const merged = mergeLiveSlateGamesWithSeed(degradedLiveGames, seedGames);
    for (const game of merged) {
      const baseline = buildHistoricalMatchupBaseline(game);
      assert.equal(
        baseline.isEmptyFallback,
        false,
        `${game.matchup} should keep historical context after merge`,
      );
    }
  });

  it("builds live slate H2H from cached logs when disk reads are unavailable", () => {
    const wnbaLogs = JSON.parse(
      readFileSync("data/wnba/game-logs.json", "utf8"),
    ) as Parameters<typeof setCachedGameLogs>[1];

    clearRuntimeGameLogsModuleCache();
    setCachedGameLogs("WNBA", wnbaLogs);

    const assignments = JSON.parse(
      readFileSync("data/wnba/assignments.json", "utf8"),
    ) as AssignmentsFile;
    const entry = collectLeagueSlateEntries("wnba", assignments).find((row) =>
      row.matchup.includes("CON @ WAS"),
    );
    assert.ok(entry);

    const baseline = buildHistoricalMatchupBaseline(entry);
    assert.equal(baseline.isEmptyFallback, false);
    assert.ok((entry.preview?.matchupBriefing?.h2hGames ?? 0) > 0);

    clearRuntimeGameLogsModuleCache();
  });

  it("homepage SSR preloads game logs and merges snapshot seed", () => {
    const page = readFileSync("src/app/page.tsx", "utf8");
    const section = readFileSync("src/components/OverviewUpcomingSlateSection.tsx", "utf8");
    const hook = readFileSync("src/lib/use-live-slate.ts", "utf8");

    assert.match(page, /preloadGameLogsForLiveSlate/);
    assert.match(page, /mergeLiveSlateGamesWithSeed/);
    assert.match(page, /historicalSeedGames=\{snapshot\.upcomingSlate\.games/);
    assert.match(section, /historicalSeedGames/);
    assert.match(hook, /historicalSeedGames/);
  });
});
