#!/usr/bin/env npx tsx
import { refreshBaselinesFromGameLogs } from "./lib/baselines";

function main() {
  const file = refreshBaselinesFromGameLogs(
    "Computed from NBA/NHL/NFL/EPL/La Liga game logs",
  );
  console.log(
    `Baselines written: ` +
      `NBA ${file.NBA.aggregate.gameCount} (${file.NBA.usingFallback ? "fallback" : "computed"}), ` +
      `NHL ${file.NHL.aggregate.gameCount} (${file.NHL.usingFallback ? "fallback" : "computed"}), ` +
      `NFL ${file.NFL.aggregate.gameCount} (${file.NFL.usingFallback ? "fallback" : "computed"}), ` +
      `EPL ${file.EPL.aggregate.gameCount} (${file.EPL.usingFallback ? "fallback" : "computed"}), ` +
      `LALIGA ${file.LALIGA.aggregate.gameCount} (${file.LALIGA.usingFallback ? "fallback" : "computed"})`,
  );
}

main();
