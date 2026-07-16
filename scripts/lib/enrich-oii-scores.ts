import * as fs from "node:fs";
import * as path from "node:path";
import { enrichRefStatsWithCachedOii } from "../../src/lib/officiating-intelligence-index";
import type { RefStatsFile } from "../../src/lib/types";

const LEAGUE_REF_STATS_PATHS: { id: string; rel: string }[] = [
  { id: "nba", rel: "data/ref-stats.json" },
  { id: "nfl", rel: "data/nfl/ref-stats.json" },
  { id: "nhl", rel: "data/nhl/ref-stats.json" },
  { id: "epl", rel: "data/epl/ref-stats.json" },
  { id: "laliga", rel: "data/laliga/ref-stats.json" },
  { id: "cbb", rel: "data/cbb/ref-stats.json" },
  { id: "cfb", rel: "data/cfb/ref-stats.json" },
];

export function enrichAllLeagueCachedOii(root = process.cwd()): {
  leagues: { id: string; updated: number }[];
} {
  const leagues: { id: string; updated: number }[] = [];

  for (const { id, rel } of LEAGUE_REF_STATS_PATHS) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) continue;

    const stats = JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
    const updated = enrichRefStatsWithCachedOii(stats);
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2));

    const corePath = filePath.replace(/ref-stats\.json$/, "ref-stats-core.json");
    if (fs.existsSync(corePath)) {
      const core = JSON.parse(fs.readFileSync(corePath, "utf8")) as RefStatsFile;
      enrichRefStatsWithCachedOii(core);
      fs.writeFileSync(corePath, JSON.stringify(core, null, 2));
    }

    leagues.push({ id, updated });
  }

  return { leagues };
}
