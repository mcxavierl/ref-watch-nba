#!/usr/bin/env npx tsx
import {
  buildBaselinesFile,
  saveBaselines,
} from "./lib/baselines";
import { loadGameLogs } from "./lib/game-logs";

function main() {
  const nba = loadGameLogs("NBA");
  const nhl = loadGameLogs("NHL");
  const nfl = loadGameLogs("NFL");
  const epl = loadGameLogs("EPL");
  const file = buildBaselinesFile(
    nba?.games ?? [],
    nhl?.games ?? [],
    "Computed from NBA/NHL/NFL/EPL game logs",
    nfl?.games ?? [],
    epl?.games ?? [],
  );
  saveBaselines(file);
  console.log(
    `Baselines written: ` +
      `NBA ${file.NBA.aggregate.gameCount} (${file.NBA.usingFallback ? "fallback" : "computed"}), ` +
      `NHL ${file.NHL.aggregate.gameCount} (${file.NHL.usingFallback ? "fallback" : "computed"}), ` +
      `NFL ${file.NFL.aggregate.gameCount} (${file.NFL.usingFallback ? "fallback" : "computed"}), ` +
      `EPL ${file.EPL.aggregate.gameCount} (${file.EPL.usingFallback ? "fallback" : "computed"})`,
  );
}

main();
