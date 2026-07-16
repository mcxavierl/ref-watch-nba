import * as fs from "node:fs";
import * as path from "node:path";
import {
  enrichRefStatsWithCachedOii,
  generateOII,
  refOiiEnrichFingerprint,
} from "../../src/lib/officiating-intelligence-index";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";

const LEAGUE_REF_STATS_PATHS: { id: string; rel: string }[] = [
  { id: "nba", rel: "data/ref-stats.json" },
  { id: "nfl", rel: "data/nfl/ref-stats.json" },
  { id: "nhl", rel: "data/nhl/ref-stats.json" },
  { id: "epl", rel: "data/epl/ref-stats.json" },
  { id: "laliga", rel: "data/laliga/ref-stats.json" },
  { id: "cbb", rel: "data/cbb/ref-stats.json" },
  { id: "cfb", rel: "data/cfb/ref-stats.json" },
];

const OII_ENRICH_CACHE_FILE = "data/.oii-enrich-cache.json";

type OiiEnrichCacheEntry = {
  fingerprint: string;
  score: number | null;
};

type OiiEnrichCacheFile = {
  version: 1;
  leagues: Record<string, Record<string, OiiEnrichCacheEntry>>;
};

function emptyCache(): OiiEnrichCacheFile {
  return { version: 1, leagues: {} };
}

export function loadOiiEnrichCache(root = process.cwd()): OiiEnrichCacheFile {
  const cachePath = path.join(root, OII_ENRICH_CACHE_FILE);
  if (!fs.existsSync(cachePath)) return emptyCache();
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf8")) as OiiEnrichCacheFile;
    if (parsed?.version !== 1 || typeof parsed.leagues !== "object") {
      return emptyCache();
    }
    return parsed;
  } catch {
    return emptyCache();
  }
}

export function saveOiiEnrichCache(
  cache: OiiEnrichCacheFile,
  root = process.cwd(),
): void {
  const cachePath = path.join(root, OII_ENRICH_CACHE_FILE);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function resolveCachedOiiScore(
  ref: RefProfile,
  leagueAvgFouls?: number,
): number | null {
  const result = generateOII(ref.slug, {
    recentGames: ref.recentGames,
    leagueAvgFouls,
    sampleSize: ref.games,
  });
  return result.status === "ok" ? result.score : null;
}

/**
 * Recompute cached_oii_score only for refs whose fingerprint changed.
 * Writes ref-stats JSON only when at least one score changes in that file.
 */
export function enrichRefStatsWithCachedOiiIncremental(
  stats: RefStatsFile,
  leagueId: string,
  cache: OiiEnrichCacheFile,
): { updated: number; skipped: number; touched: boolean } {
  const leagueAvg = stats.meta.leagueAvgFouls;
  const leagueCache = (cache.leagues[leagueId] ??= {});
  let updated = 0;
  let skipped = 0;
  let touched = false;

  for (const ref of stats.refs) {
    const fingerprint = refOiiEnrichFingerprint(ref);
    const cachedEntry = leagueCache[ref.slug];
    const nextScore = resolveCachedOiiScore(ref, leagueAvg);

    if (
      cachedEntry &&
      cachedEntry.fingerprint === fingerprint &&
      cachedEntry.score === nextScore &&
      ref.cached_oii_score === nextScore
    ) {
      skipped++;
      continue;
    }

    if (ref.cached_oii_score !== nextScore) {
      ref.cached_oii_score = nextScore;
      updated++;
      touched = true;
    }

    leagueCache[ref.slug] = { fingerprint, score: nextScore };
  }

  return { updated, skipped, touched };
}

function writeStatsIfPresent(filePath: string, stats: RefStatsFile): void {
  if (!fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, JSON.stringify(stats, null, 2));
}

export function enrichAllLeagueCachedOii(
  root = process.cwd(),
  options?: { incremental?: boolean },
): {
  leagues: { id: string; updated: number; skipped?: number }[];
} {
  const incremental = options?.incremental ?? true;
  const cache = incremental ? loadOiiEnrichCache(root) : emptyCache();
  const leagues: { id: string; updated: number; skipped?: number }[] = [];

  for (const { id, rel } of LEAGUE_REF_STATS_PATHS) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) continue;

    const stats = JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
    let updated = 0;
    let skipped = 0;
    let touched = false;

    if (incremental) {
      const result = enrichRefStatsWithCachedOiiIncremental(stats, id, cache);
      updated = result.updated;
      skipped = result.skipped;
      touched = result.touched;
    } else {
      updated = enrichRefStatsWithCachedOii(stats);
      touched = updated > 0;
      for (const ref of stats.refs) {
        const leagueCache = (cache.leagues[id] ??= {});
        leagueCache[ref.slug] = {
          fingerprint: refOiiEnrichFingerprint(ref),
          score: ref.cached_oii_score ?? null,
        };
      }
    }

    if (touched) {
      writeStatsIfPresent(filePath, stats);
    }

    const corePath = filePath.replace(/ref-stats\.json$/, "ref-stats-core.json");
    if (fs.existsSync(corePath)) {
      const core = JSON.parse(fs.readFileSync(corePath, "utf8")) as RefStatsFile;
      if (incremental) {
        const coreResult = enrichRefStatsWithCachedOiiIncremental(core, id, cache);
        if (coreResult.touched) {
          writeStatsIfPresent(corePath, core);
        }
        updated += coreResult.updated;
        skipped += coreResult.skipped;
      } else {
        const coreUpdated = enrichRefStatsWithCachedOii(core);
        if (coreUpdated > 0) {
          writeStatsIfPresent(corePath, core);
        }
        updated += coreUpdated;
      }
    }

    leagues.push({ id, updated, skipped: incremental ? skipped : undefined });
  }

  saveOiiEnrichCache(cache, root);
  return { leagues };
}
