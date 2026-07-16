import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { REF_GAME_COUNT_LEAGUES } from "./fix-ref-game-counts";
import {
  countRefGamesFromLogs,
  countRefGamesFromLogsMatching,
  type RefGameLogRow,
} from "../src/lib/game-count";
import { canonicalRefKey } from "./lib/ref-identity";
import type { RefStatsFile } from "./lib/types";

const ROOT = process.cwd();

function loadJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

describe("verify-data-integrity ref game counts", () => {
  for (const league of REF_GAME_COUNT_LEAGUES) {
    it(`${league.id} stored ref.games match DISTINCT game_id logs`, () => {
      const logsPath = path.join(ROOT, league.gameLogPath);
      const statsPath = path.join(ROOT, league.corePath);
      if (!fs.existsSync(logsPath) || !fs.existsSync(statsPath)) {
        return;
      }

      const logs = loadJson<{ games?: RefGameLogRow[] }>(league.gameLogPath).games ?? [];
      const stats = loadJson<RefStatsFile>(league.corePath);
      const seasons = stats.meta.seasons?.length
        ? stats.meta.seasons
        : undefined;

      let refsWithGames = 0;
      let mismatches = 0;
      let checked = 0;
      for (const ref of stats.refs) {
        if (ref.games > 0) refsWithGames++;
        const expected = league.useCanonicalKey
          ? countRefGamesFromLogsMatching(
              logs,
              (official) =>
                canonicalRefKey(official.name) === canonicalRefKey(ref.name),
              seasons,
            )
          : countRefGamesFromLogs(logs, ref.slug, seasons);
        if (expected === 0) continue;
        checked++;
        const drift =
          Math.abs((ref.games - expected) / expected) * 100;
        if (drift > league.maxDriftPct) mismatches++;
      }

      if (refsWithGames > 0 && checked === 0) {
        return;
      }

      assert.equal(
        mismatches,
        0,
        `${league.id}: ${mismatches} refs exceed ${league.maxDriftPct}% drift`,
      );
    });
  }
});
