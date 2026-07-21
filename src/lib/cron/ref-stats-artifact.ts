import * as fs from "node:fs";
import * as path from "node:path";
import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

export function refStatsFilePath(leagueId: LeagueId): string {
  if (leagueId === "nba") {
    const core = path.join(DATA_DIR, "ref-stats-core.json");
    if (fs.existsSync(core)) return core;
    return path.join(DATA_DIR, "ref-stats.json");
  }
  const core = path.join(DATA_DIR, leagueId, "ref-stats-core.json");
  if (fs.existsSync(core)) return core;
  return path.join(DATA_DIR, leagueId, "ref-stats.json");
}

export function loadLeagueRefStats(leagueId: LeagueId): RefStatsFile | null {
  const filePath = refStatsFilePath(leagueId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
  } catch {
    return null;
  }
}

export function writeLeagueRefStats(leagueId: LeagueId, stats: RefStatsFile): string {
  const filePath = refStatsFilePath(leagueId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(stats, null, 2)}\n`);
  const publicPath = path.join(
    process.cwd(),
    "public",
    leagueId === "nba" ? "data" : `data/${leagueId}`,
    path.basename(filePath),
  );
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, `${JSON.stringify(stats, null, 2)}\n`);
  return filePath;
}

export const REF_ROLLING_METRICS_CACHE_PATH = path.join(
  DATA_DIR,
  "ref-rolling-metrics-cache.json",
);

export type RefRollingMetricsCacheFile = {
  lastUpdated: string;
  officials: Record<string, import("@/lib/cron/recalibrate-profiles-types").RecalibratedOfficialMetrics>;
};

export function loadRollingMetricsCache(): RefRollingMetricsCacheFile {
  if (!fs.existsSync(REF_ROLLING_METRICS_CACHE_PATH)) {
    return { lastUpdated: "", officials: {} };
  }
  try {
    return JSON.parse(
      fs.readFileSync(REF_ROLLING_METRICS_CACHE_PATH, "utf8"),
    ) as RefRollingMetricsCacheFile;
  } catch {
    return { lastUpdated: "", officials: {} };
  }
}

export function writeRollingMetricsCache(cache: RefRollingMetricsCacheFile): void {
  fs.mkdirSync(path.dirname(REF_ROLLING_METRICS_CACHE_PATH), { recursive: true });
  fs.writeFileSync(REF_ROLLING_METRICS_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

export function rollingMetricsCacheKey(leagueId: LeagueId, slug: string): string {
  return `${leagueId}:${slug}`;
}
