#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRefStatsFromLogs } from "./build-ref-stats-from-logs";

const stats = buildRefStatsFromLogs();
const outPath = path.join(process.cwd(), "data", "ref-stats.json");
fs.writeFileSync(outPath, `${JSON.stringify(stats, null, 2)}\n`);
console.log(
  `Wrote ${stats.refs.length} refs, ${stats.meta.totalGamesProcessed} games → ${outPath}`,
);
