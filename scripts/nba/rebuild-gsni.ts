#!/usr/bin/env npx tsx
/**
 * Attach Game-State Index (GSNI) fields to NBA ref-stats from game logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { attachGsniFieldsFromGames } from "../lib/attach-gsni";
import { loadGameLogs } from "../lib/game-logs";
import { splitRefStatsForDeploy } from "../lib/split-ref-stats";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES } from "../../src/lib/gsni";
import type { RefStatsFile } from "../../src/lib/types";

const ROOT = process.cwd();
const STATS_PATH = path.join(ROOT, "data", "ref-stats.json");
const CORE_PATH = path.join(ROOT, "data", "ref-stats-core.json");

function writeStats(stats: RefStatsFile): void {
  const payload = `${JSON.stringify(stats, null, 2)}\n`;
  fs.writeFileSync(STATS_PATH, payload);
  if (fs.existsSync(CORE_PATH)) {
    const { core } = splitRefStatsForDeploy(stats);
    fs.writeFileSync(CORE_PATH, `${JSON.stringify(core, null, 2)}\n`);
  }
}

function main(): void {
  console.log("=== NBA GSNI rebuild ===\n");

  const logs = loadGameLogs("NBA");
  if (!logs?.games.length) {
    throw new Error("No NBA game logs found at data/game-logs.json");
  }

  if (!fs.existsSync(STATS_PATH)) {
    throw new Error(`Missing ${STATS_PATH}`);
  }

  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const refsWithGsni = attachGsniFieldsFromGames(stats.refs, logs.games, undefined, {
    minHighLeverageMinutes: GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  });

  const qualified = refsWithGsni.filter((ref) => ref.referee_gsni !== undefined);
  const output: RefStatsFile = {
    ...stats,
    refs: refsWithGsni,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
    },
  };

  writeStats(output);

  console.log(`GSNI qualified officials: ${qualified.length}/${refsWithGsni.length}`);
  const top = [...qualified]
    .sort((a, b) => (b.referee_gsni ?? 0) - (a.referee_gsni ?? 0))
    .slice(0, 5);
  for (const ref of top) {
    console.log(
      `  ${ref.name}: ${ref.referee_gsni}σ (HL min ${ref.gsniHighLeverageMinutes}, ${ref.gsniSampleGames} games)`,
    );
  }
}

main();
