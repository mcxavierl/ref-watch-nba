import * as fs from "node:fs";
import * as path from "node:path";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "../../src/lib/league-verification";
import { slimLeagueStatsToRefStatsFile } from "../../src/lib/insights/insight-input-slim";
import { buildLeagueStandoutCardsForLeague } from "../../src/lib/insights/league-card-from-stats";
import {
  generateTopStoriesFromCandidates,
  hydrateOutlierCandidates,
  scanLeagueOutliersFromSlim,
  serializeOutlierCandidates,
  type CachedOutlierCandidate,
  type InsightOutlierCandidate,
  type OverviewInsightsPayload,
} from "../../src/lib/insights/generator-core";
import type { LeagueInsightCard } from "../../src/lib/league-overview-insights";
import {
  getLeagueInsightSourceMtime,
  loadLeagueGeneratorSetup,
  loadSlimLeagueStatsForInsights,
  tryClearDataModuleCaches,
  tryRunGc,
  type ProInsightLeagueId,
} from "./insights-data-loader";
import {
  hasNcaaLiveConferenceCoverage,
  isNcaaConferenceGatedLeague,
} from "../../src/lib/ncaa-conference-gate";

function buildRoot(): string {
  return process.env.INSIGHTS_BUILD_ROOT ?? process.cwd();
}

const CACHE_DIR = path.join("data", "insights-cache");

function cacheDir(): string {
  return path.join(buildRoot(), CACHE_DIR);
}

function manifestPath(): string {
  return path.join(cacheDir(), "manifest.json");
}

function overviewDataPath(): string {
  return path.join(buildRoot(), "data", "overview-insights.json");
}

export type InsightsBuildOptions = {
  force?: boolean;
};

type LeagueInsightCacheEntry = {
  sourceMtime: number;
  generatedAt: string;
  leagueCards: LeagueInsightCard[];
  outlierCandidates: CachedOutlierCandidate[];
};

type InsightsCacheManifest = {
  leagues: Record<
    string,
    {
      sourceMtime: number;
      cachePath: string;
    }
  >;
};

function leagueCachePath(leagueId: ProInsightLeagueId): string {
  return path.join(cacheDir(), `${leagueId}.json`);
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readManifest(): InsightsCacheManifest {
  return readJsonFile<InsightsCacheManifest>(manifestPath()) ?? { leagues: {} };
}

function writeManifest(manifest: InsightsCacheManifest): void {
  fs.mkdirSync(cacheDir(), { recursive: true });
  fs.writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeLeagueCache(leagueId: ProInsightLeagueId, entry: LeagueInsightCacheEntry): void {
  fs.mkdirSync(cacheDir(), { recursive: true });
  const cachePath = leagueCachePath(leagueId);
  fs.writeFileSync(cachePath, `${JSON.stringify(entry, null, 2)}\n`);
}

function readLeagueCache(leagueId: ProInsightLeagueId): LeagueInsightCacheEntry | null {
  return readJsonFile<LeagueInsightCacheEntry>(leagueCachePath(leagueId));
}

function readExistingGeneratedAt(): string | null {
  const existing = readJsonFile<OverviewInsightsPayload>(overviewDataPath());
  return existing?.generatedAt ?? null;
}

type LeagueBuildResult = {
  leagueId: ProInsightLeagueId;
  leagueCards: LeagueInsightCard[];
  outlierCandidates: InsightOutlierCandidate[];
  regenerated: boolean;
  generatedAt: string;
  sourceMtime: number;
};

async function buildLeagueInsights(
  leagueId: ProInsightLeagueId,
  force: boolean,
): Promise<LeagueBuildResult> {
  const sourceMtime = getLeagueInsightSourceMtime(leagueId);
  const cached = force ? null : readLeagueCache(leagueId);

  if (cached && cached.sourceMtime === sourceMtime) {
    console.log(`Insights: ${leagueId} cache hit`);
    const leagueCards =
      cached.leagueCards ??
      ("leagueCard" in cached && cached.leagueCard ? [cached.leagueCard] : []);
    return {
      leagueId,
      leagueCards,
      outlierCandidates: hydrateOutlierCandidates(cached.outlierCandidates),
      regenerated: false,
      generatedAt: cached.generatedAt,
      sourceMtime,
    };
  }

  console.log(`Insights: regenerating ${leagueId} (source changed)...`);

  const slimBundle = await loadSlimLeagueStatsForInsights(leagueId);
  if (
    !slimBundle ||
    slimBundle.refs.length === 0 ||
    (isNcaaConferenceGatedLeague(leagueId) &&
      !hasNcaaLiveConferenceCoverage(
        leagueId,
        slimLeagueStatsToRefStatsFile(slimBundle),
      ))
  ) {
    const generatedAt = new Date().toISOString();
    const empty: LeagueInsightCacheEntry = {
      sourceMtime,
      generatedAt,
      leagueCards: [],
      outlierCandidates: [],
    };
    writeLeagueCache(leagueId, empty);
    return {
      leagueId,
      leagueCards: [],
      outlierCandidates: [],
      regenerated: true,
      generatedAt,
      sourceMtime,
    };
  }

  const setup = await loadLeagueGeneratorSetup(leagueId, slimBundle.getTeamSplits);

  const stats = slimLeagueStatsToRefStatsFile(slimBundle);
  const leagueCards = buildLeagueStandoutCardsForLeague(leagueId, stats, setup);
  const outlierCandidates = scanLeagueOutliersFromSlim(slimBundle, setup);

  const generatedAt = new Date().toISOString();
  writeLeagueCache(leagueId, {
    sourceMtime,
    generatedAt,
    leagueCards,
    outlierCandidates: serializeOutlierCandidates(outlierCandidates),
  });

  slimBundle.refs.length = 0;
  tryClearDataModuleCaches();
  tryRunGc();

  return {
    leagueId,
    leagueCards,
    outlierCandidates,
    regenerated: true,
    generatedAt,
    sourceMtime,
  };
}

export async function buildOverviewInsightsPayload(
  options: InsightsBuildOptions = {},
): Promise<OverviewInsightsPayload> {
  const force = options.force ?? false;
  const cards: LeagueInsightCard[] = [];
  const allCandidates: InsightOutlierCandidate[] = [];
  let anyRegenerated = false;
  let latestRegeneratedAt: string | null = null;
  const manifest = readManifest();

  for (const leagueId of PRO_VERIFIED_LIVE_LEAGUE_IDS) {
    const result = await buildLeagueInsights(leagueId, force);
    if (result.leagueCards.length > 0) cards.push(...result.leagueCards);
    allCandidates.push(...result.outlierCandidates);
    if (result.regenerated) {
      anyRegenerated = true;
      latestRegeneratedAt = result.generatedAt;
    }

    manifest.leagues[leagueId] = {
      sourceMtime: result.sourceMtime,
      cachePath: path.relative(buildRoot(), leagueCachePath(leagueId)),
    };

    tryClearDataModuleCaches();
    tryRunGc();
  }

  writeManifest(manifest);

  const { stories, status } = generateTopStoriesFromCandidates(allCandidates);

  const generatedAt =
    anyRegenerated && latestRegeneratedAt
      ? latestRegeneratedAt
      : readExistingGeneratedAt() ?? new Date().toISOString();

  return {
    generatedAt,
    cards,
    topStories: stories,
    topStoriesStatus: status,
  };
}

export function shouldSkipLeagueRegeneration(
  leagueId: ProInsightLeagueId,
  force: boolean,
): boolean {
  if (force) return false;
  const sourceMtime = getLeagueInsightSourceMtime(leagueId);
  const cached = readLeagueCache(leagueId);
  return Boolean(cached && cached.sourceMtime === sourceMtime);
}
