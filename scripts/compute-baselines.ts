#!/usr/bin/env npx tsx
import {
  buildBaselinesFile,
  saveBaselines,
} from "./lib/baselines";
import { loadGameLogs } from "./lib/game-logs";

function main() {
  const nba = loadGameLogs("NBA");
  const nhl = loadGameLogs("NHL");
  const file = buildBaselinesFile(
    nba?.games ?? [],
    nhl?.games ?? [],
    "Computed from data/game-logs.json and data/nhl/game-logs.json",
  );
  saveBaselines(file);
  console.log(
    `Baselines written: NBA ${file.NBA.aggregate.gameCount} games (${file.NBA.usingFallback ? "fallback" : "computed"}), ` +
      `NHL ${file.NHL.aggregate.gameCount} games (${file.NHL.usingFallback ? "fallback" : "computed"})`,
  );
}

main();
