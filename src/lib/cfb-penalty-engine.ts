import { normalizeNflPenaltyType } from "@/lib/impact-calculator";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  clearedOutlierGate,
  computeMetricsBaselines,
  conferenceForGame,
  NCAA_MIN_OUTLIER_GAMES,
} from "@/lib/metrics-computer";
import type { NflPenaltyEvent, NflPenaltyTypeSlug } from "@/lib/types";
import type { RefStatsFile } from "@/lib/types";
import {
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

export { NCAA_MIN_OUTLIER_GAMES as CFB_PENALTY_ENGINE_MIN_GAMES };

export type DownDistanceBucket =
  | "early_downs"
  | "third_short"
  | "third_long"
  | "fourth_down";

export interface CfbPenaltyOutlier {
  id: string;
  kind: "holding-pi-variance" | "home-penalty-suppression";
  refSlug: string;
  refName: string;
  games: number;
  conference: string;
  headline: string;
  summary: string;
  metricValue: string;
  baselineValue: string;
  deltaLabel: string;
  severity: number;
  sampleGateCleared: boolean;
  bucket?: DownDistanceBucket;
}

export interface CfbPenaltyEngineDataset {
  version: 1;
  generatedAt: string;
  minGames: number;
  outliers: CfbPenaltyOutlier[];
}

const HOLDING_PI_TYPES = new Set<NflPenaltyTypeSlug>([
  "defensive_holding",
  "offensive_holding",
  "defensive_pass_interference",
  "offensive_pass_interference",
  "pass_interference",
]);

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function downDistanceBucket(
  down?: number,
  distance?: number,
): DownDistanceBucket {
  if (down === 4) return "fourth_down";
  if (down === 3) {
    return (distance ?? 10) <= 3 ? "third_short" : "third_long";
  }
  return "early_downs";
}

function judgmentFlagsInGame(game: RuntimeGameLogEntry): number | null {
  if (game.subjectiveFlags !== undefined) return game.subjectiveFlags;
  if (!game.penaltyEvents?.length) return null;
  return game.penaltyEvents.filter((event) =>
    HOLDING_PI_TYPES.has(event.type),
  ).length;
}

function holdingPiFromEvents(events: NflPenaltyEvent[]): Record<DownDistanceBucket, number> {
  const counts: Record<DownDistanceBucket, number> = {
    early_downs: 0,
    third_short: 0,
    third_long: 0,
    fourth_down: 0,
  };
  for (const event of events) {
    if (!HOLDING_PI_TYPES.has(event.type)) continue;
    const bucket = downDistanceBucket(
      event.leverage.down,
      event.leverage.distance,
    );
    counts[bucket] += 1;
  }
  return counts;
}

function penaltyEngineCacheKey(scopedSeasons: string[]): string {
  return `cfb-penalty-engine:v1:${[...scopedSeasons].sort().join(",")}`;
}

export function computeCfbPenaltyEngine(
  games: RuntimeGameLogEntry[],
  scopedSeasons: string[],
): CfbPenaltyOutlier[] {
  const seasonSet = new Set(scopedSeasons);
  const scoped = games.filter(
    (game) => game.league === "CFB" && seasonSet.has(game.season),
  );
  if (scoped.length === 0) return [];

  const baselines = computeMetricsBaselines(scoped, "cfb");
  const holdingPi = new Map<
    string,
    {
      name: string;
      games: number;
      buckets: Record<DownDistanceBucket, number[]>;
      conferences: Map<string, number>;
    }
  >();
  const homeSuppression = new Map<
    string,
    {
      name: string;
      games: number;
      homeFlags: number;
      awayFlags: number;
      conferences: Map<string, number>;
    }
  >();

  for (const game of scoped) {
    const conference = conferenceForGame(game, "cfb");
    const judgment = judgmentFlagsInGame(game);
    const bucketCounts = game.penaltyEvents?.length
      ? holdingPiFromEvents(game.penaltyEvents)
      : null;

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (bucketCounts) {
        const hpBucket = holdingPi.get(slug) ?? {
          name: official.name,
          games: 0,
          buckets: {
            early_downs: [],
            third_short: [],
            third_long: [],
            fourth_down: [],
          },
          conferences: new Map<string, number>(),
        };
        hpBucket.games += 1;
        for (const bucket of Object.keys(hpBucket.buckets) as DownDistanceBucket[]) {
          hpBucket.buckets[bucket].push(bucketCounts[bucket]);
        }
        hpBucket.conferences.set(
          conference,
          (hpBucket.conferences.get(conference) ?? 0) + 1,
        );
        holdingPi.set(slug, hpBucket);
      } else if (judgment !== null) {
        const hpBucket = holdingPi.get(slug) ?? {
          name: official.name,
          games: 0,
          buckets: {
            early_downs: [],
            third_short: [],
            third_long: [],
            fourth_down: [],
          },
          conferences: new Map<string, number>(),
        };
        hpBucket.games += 1;
        hpBucket.buckets.early_downs.push(judgment * 0.35);
        hpBucket.buckets.third_short.push(judgment * 0.2);
        hpBucket.buckets.third_long.push(judgment * 0.35);
        hpBucket.buckets.fourth_down.push(judgment * 0.1);
        hpBucket.conferences.set(
          conference,
          (hpBucket.conferences.get(conference) ?? 0) + 1,
        );
        holdingPi.set(slug, hpBucket);
      }

      if (game.homeFlags !== undefined && game.awayFlags !== undefined) {
        const hsBucket = homeSuppression.get(slug) ?? {
          name: official.name,
          games: 0,
          homeFlags: 0,
          awayFlags: 0,
          conferences: new Map<string, number>(),
        };
        hsBucket.games += 1;
        hsBucket.homeFlags += game.homeFlags;
        hsBucket.awayFlags += game.awayFlags;
        hsBucket.conferences.set(
          conference,
          (hsBucket.conferences.get(conference) ?? 0) + 1,
        );
        homeSuppression.set(slug, hsBucket);
      }
    }
  }

  const outliers: CfbPenaltyOutlier[] = [];

  for (const [slug, bucket] of holdingPi) {
    if (!clearedOutlierGate(bucket.games)) continue;
    const primaryConference = [...bucket.conferences.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const confBaseline = primaryConference
      ? baselines.byConference[primaryConference as keyof typeof baselines.byConference]
      : null;

    for (const ddBucket of Object.keys(bucket.buckets) as DownDistanceBucket[]) {
      const values = bucket.buckets[ddBucket];
      if (values.length < NCAA_MIN_OUTLIER_GAMES) continue;
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const baseline = (confBaseline?.avgFlags ?? baselines.league.avgFlags) * 0.35;
      const delta = avg - baseline;
      if (Math.abs(delta) < 0.45) continue;

      outliers.push({
        id: `cfb-hpi-${ddBucket}-${slug}`,
        kind: "holding-pi-variance",
        refSlug: slug,
        refName: bucket.name,
        games: values.length,
        conference: primaryConference ?? "Other",
        bucket: ddBucket,
        headline: `${bucket.name} shows ${ddBucket.replace("_", " ")} holding/PI variance`,
        summary: `Average ${avg.toFixed(1)} judgment penalties per game vs ${baseline.toFixed(1)} conference-adjusted baseline in ${primaryConference ?? "league"} games.`,
        metricValue: avg.toFixed(1),
        baselineValue: baseline.toFixed(1),
        deltaLabel: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs conf.`,
        severity: Math.abs(delta) * values.length,
        sampleGateCleared: true,
      });
    }
  }

  for (const [slug, bucket] of homeSuppression) {
    if (!clearedOutlierGate(bucket.games)) continue;
    const primaryConference = [...bucket.conferences.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const confBaseline = primaryConference
      ? baselines.byConference[primaryConference as keyof typeof baselines.byConference]
      : baselines.league;
    const officialHomeRate = bucket.homeFlags / bucket.games;
    const officialAwayRate = bucket.awayFlags / bucket.games;
    const suppression =
      (officialAwayRate - officialHomeRate) /
      Math.max(0.5, confBaseline.avgAwayFlags - confBaseline.avgHomeFlags || 1);
    if (suppression < 0.18) continue;

    outliers.push({
      id: `cfb-home-sup-${slug}`,
      kind: "home-penalty-suppression",
      refSlug: slug,
      refName: bucket.name,
      games: bucket.games,
      conference: primaryConference ?? "Other",
      headline: `${bucket.name} suppresses home penalties in ${primaryConference ?? "league"} games`,
      summary: `Home flags ${officialHomeRate.toFixed(1)} vs away ${officialAwayRate.toFixed(1)} per game; conference home/away split ${confBaseline.avgHomeFlags}/${confBaseline.avgAwayFlags}.`,
      metricValue: officialHomeRate.toFixed(1),
      baselineValue: confBaseline.avgHomeFlags.toFixed(1),
      deltaLabel: `${(suppression * 100).toFixed(0)}% suppression index`,
      severity: suppression * bucket.games,
      sampleGateCleared: true,
    });
  }

  return outliers.sort((a, b) => b.severity - a.severity);
}

export function getCfbPenaltyEngineDataset(
  stats: RefStatsFile,
  scopedSeasons: string[],
  gameLogs?: RuntimeGameLogEntry[],
): CfbPenaltyEngineDataset {
  const cacheKey = penaltyEngineCacheKey(scopedSeasons);
  const store = getWorkerIsolateStore();
  const cached = store.matrixCompute.get(cacheKey) as
    | CfbPenaltyEngineDataset
    | undefined;
  if (cached) return cached;

  const logs =
    gameLogs ??
    loadRuntimeGameLogs("CFB")?.games ??
    [];
  const outliers = computeCfbPenaltyEngine(logs, scopedSeasons);
  releaseParsedPayload(logs);

  const dataset: CfbPenaltyEngineDataset = {
    version: 1,
    generatedAt: stats.meta.lastUpdated,
    minGames: NCAA_MIN_OUTLIER_GAMES,
    outliers,
  };
  store.matrixCompute.set(cacheKey, dataset);
  return dataset;
}

/** Classify raw penalty text for CFB event enrichment pipelines. */
export function classifyCfbPenaltyType(raw: string): NflPenaltyTypeSlug {
  return normalizeNflPenaltyType(raw);
}
