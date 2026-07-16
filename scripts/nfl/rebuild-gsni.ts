#!/usr/bin/env npx tsx
/**
 * Build nflverse play-level penalty events, enrich game logs, and attach GSNI to ref-stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { attachNflGsniFieldsFromGames } from "../lib/attach-gsni";
import { loadGameLogs } from "../lib/game-logs";
import {
  attachPenaltyEventsToGameLogs,
  compactGameLogPenaltyPayload,
  enrichGameLogsWithPenaltyEvents,
} from "./lib/attach-penalty-events";
import { loadNflversePenaltyEventIndex } from "./lib/nflverse-penalty-events";
import type { RefStatsFile } from "../../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");

function parseYearArg(flag: string): number | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : undefined;
}

async function main(): Promise<void> {
  const minYear = parseYearArg("--min-year") ?? 2000;
  const maxYear = parseYearArg("--max-year") ?? 2024;
  const force = process.argv.includes("--force");
  const eventsOnly = process.argv.includes("--events-only");

  console.log("=== NFL GSNI rebuild ===\n");
  console.log(`Penalty events: nflverse PBP ${minYear}–${maxYear}`);

  await loadNflversePenaltyEventIndex(DATA_DIR, { minYear, maxYear, force });

  const attachResult = attachPenaltyEventsToGameLogs(DATA_DIR, { compact: true });
  console.log(
    `Penalty events attached to ${attachResult.applied}/${attachResult.total} games`,
  );

  if (eventsOnly) return;

  const logs = loadGameLogs("NFL");
  if (!logs?.games.length) {
    throw new Error("No NFL game logs found at data/nfl/game-logs.json");
  }

  const enrichedGames = enrichGameLogsWithPenaltyEvents(logs.games, DATA_DIR).games;

  if (!fs.existsSync(STATS_PATH)) {
    throw new Error(`Missing ${STATS_PATH}`);
  }

  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const refsWithGsni = attachNflGsniFieldsFromGames(stats.refs, enrichedGames);

  const qualified = refsWithGsni.filter((ref) => ref.referee_gsni !== undefined);
  const output: RefStatsFile = {
    ...stats,
    refs: refsWithGsni,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
    },
  };

  fs.writeFileSync(STATS_PATH, `${JSON.stringify(output, null, 2)}\n`);

  const top = [...qualified]
    .sort((a, b) => (b.referee_gsni ?? 0) - (a.referee_gsni ?? 0))
    .slice(0, 5);
  const bottom = [...qualified]
    .sort((a, b) => (a.referee_gsni ?? 0) - (b.referee_gsni ?? 0))
    .slice(0, 5);

  console.log(`\nGSNI qualified officials: ${qualified.length}/${refsWithGsni.length}`);
  console.log("\nHighest GSNI (quieter in comparable states):");
  for (const ref of top) {
    console.log(
      `  ${ref.name}: ${ref.referee_gsni} (HL min ${ref.gsniHighLeverageMinutes}, ${ref.gsniSampleGames} games)`,
    );
  }
  console.log("\nLowest GSNI (heavier in comparable states):");
  for (const ref of bottom) {
    console.log(
      `  ${ref.name}: ${ref.referee_gsni} (HL min ${ref.gsniHighLeverageMinutes}, ${ref.gsniSampleGames} games)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
