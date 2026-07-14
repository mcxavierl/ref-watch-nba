import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  clearedOutlierGate,
  computeMetricsBaselines,
  conferenceBaselineForGame,
  conferenceForGame,
  NCAA_MIN_OUTLIER_GAMES,
} from "@/lib/metrics-computer";
import { isNcaaHighStakesGame } from "@/lib/ncaa-marquee-games";
import type { RefStatsFile } from "@/lib/types";
import {
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

export { NCAA_MIN_OUTLIER_GAMES as CBB_WHISTLE_MATRIX_MIN_GAMES };

export interface CbbWhistleOutlier {
  id: string;
  kind: "crew-chief-tech-rate" | "high-stakes-ft-variance";
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
}

export interface CbbWhistleMatrixDataset {
  version: 1;
  generatedAt: string;
  minGames: number;
  outliers: CbbWhistleOutlier[];
}

type ExtendedGame = RuntimeGameLogEntry & {
  homeFouls?: number;
  awayFouls?: number;
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function crewChief(game: RuntimeGameLogEntry): (typeof game.officials)[number] | null {
  if (!game.officials.length) return null;
  return [...game.officials].sort((a, b) => a.number - b.number)[0] ?? null;
}

function technicalFoulsInGame(
  game: ExtendedGame,
  conferenceAvgFouls: number,
): { count: number; source: "personnel" | "estimated" } {
  const personnel = game.personnel;
  if (
    personnel?.homeTechnicalFouls !== undefined ||
    personnel?.awayTechnicalFouls !== undefined
  ) {
    return {
      count:
        (personnel.homeTechnicalFouls ?? 0) +
        (personnel.awayTechnicalFouls ?? 0),
      source: "personnel",
    };
  }
  const excess = Math.max(0, game.totalFouls - conferenceAvgFouls);
  return {
    count: Math.round(excess * 0.08),
    source: "estimated",
  };
}

function ftDifferentialProxy(game: ExtendedGame): number {
  if (game.homeFouls !== undefined && game.awayFouls !== undefined) {
    return game.awayFouls - game.homeFouls;
  }
  return 0;
}

function whistleMatrixCacheKey(
  scopedSeasons: string[],
): string {
  return `cbb-whistle-matrix:v1:${[...scopedSeasons].sort().join(",")}`;
}

export function computeCbbWhistleMatrix(
  games: RuntimeGameLogEntry[],
  scopedSeasons: string[],
): CbbWhistleOutlier[] {
  const seasonSet = new Set(scopedSeasons);
  const scoped = games.filter((game) => seasonSet.has(game.season));
  if (scoped.length === 0) return [];

  const baselines = computeMetricsBaselines(scoped, "cbb");
  const crewChiefTech = new Map<
    string,
    {
      name: string;
      games: number;
      techs: number;
      conferences: Map<string, number>;
    }
  >();
  const highStakesFt = new Map<
    string,
    {
      name: string;
      games: number;
      diffs: number[];
      conferences: Map<string, number>;
    }
  >();

  for (const game of scoped) {
    const chief = crewChief(game);
    if (!chief) continue;
    const slug = refSlug(chief.name, chief.number);
    const conference = conferenceForGame(game, "cbb");
    const confBaseline = conferenceBaselineForGame(baselines, game, "cbb");
    const tech = technicalFoulsInGame(
      game as ExtendedGame,
      confBaseline.avgFouls,
    );

    const chiefBucket = crewChiefTech.get(slug) ?? {
      name: chief.name,
      games: 0,
      techs: 0,
      conferences: new Map<string, number>(),
    };
    chiefBucket.games += 1;
    chiefBucket.techs += tech.count;
    chiefBucket.conferences.set(
      conference,
      (chiefBucket.conferences.get(conference) ?? 0) + 1,
    );
    crewChiefTech.set(slug, chiefBucket);

    if (!isNcaaHighStakesGame(game, "cbb")) continue;
    for (const official of game.officials) {
      const officialSlug = refSlug(official.name, official.number);
      const hsBucket = highStakesFt.get(officialSlug) ?? {
        name: official.name,
        games: 0,
        diffs: [],
        conferences: new Map<string, number>(),
      };
      hsBucket.games += 1;
      hsBucket.diffs.push(ftDifferentialProxy(game as ExtendedGame));
      hsBucket.conferences.set(
        conference,
        (hsBucket.conferences.get(conference) ?? 0) + 1,
      );
      highStakesFt.set(officialSlug, hsBucket);
    }
  }

  const outliers: CbbWhistleOutlier[] = [];

  for (const [slug, bucket] of crewChiefTech) {
    if (!clearedOutlierGate(bucket.games)) continue;
    const primaryConference = [...bucket.conferences.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const confBaseline = primaryConference
      ? baselines.byConference[primaryConference as keyof typeof baselines.byConference]
      : baselines.league;
    const techRate = bucket.techs / bucket.games;
    const baselineRate = Math.max(0.05, confBaseline.avgFouls * 0.008);
    const delta = techRate - baselineRate;
    if (delta < 0.15) continue;

    outliers.push({
      id: `cbb-tech-${slug}`,
      kind: "crew-chief-tech-rate",
      refSlug: slug,
      refName: bucket.name,
      games: bucket.games,
      conference: primaryConference ?? "Other",
      headline: `${bucket.name} runs hot on technical fouls as crew chief`,
      summary: `Technical foul rate ${techRate.toFixed(2)} per game vs ${baselineRate.toFixed(2)} conference-adjusted baseline (${primaryConference ?? "league"}).`,
      metricValue: `${techRate.toFixed(2)}/gm`,
      baselineValue: `${baselineRate.toFixed(2)}/gm`,
      deltaLabel: `+${delta.toFixed(2)} tech rate`,
      severity: delta * bucket.games,
      sampleGateCleared: true,
    });
  }

  for (const [slug, bucket] of highStakesFt) {
    if (!clearedOutlierGate(bucket.games)) continue;
    const primaryConference = [...bucket.conferences.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const confBaseline = primaryConference
      ? baselines.byConference[primaryConference as keyof typeof baselines.byConference]
      : null;
    const variance =
      bucket.diffs.reduce((sum, value) => sum + value ** 2, 0) /
      Math.max(1, bucket.diffs.length);
    const baselineVariance = confBaseline?.foulDifferentialVariance ?? 4;
    if (variance < baselineVariance * 1.35) continue;

    outliers.push({
      id: `cbb-ftvar-${slug}`,
      kind: "high-stakes-ft-variance",
      refSlug: slug,
      refName: bucket.name,
      games: bucket.games,
      conference: primaryConference ?? "Other",
      headline: `${bucket.name} shows volatile free-throw foul splits in high-stakes games`,
      summary: `Foul-differential variance ${variance.toFixed(1)} in rivalry/tournament games vs ${baselineVariance.toFixed(1)} conference norm (FT opportunity proxy).`,
      metricValue: variance.toFixed(1),
      baselineValue: baselineVariance.toFixed(1),
      deltaLabel: `+${(variance - baselineVariance).toFixed(1)} variance`,
      severity: (variance - baselineVariance) * bucket.games,
      sampleGateCleared: true,
    });
  }

  return outliers.sort((a, b) => b.severity - a.severity);
}

export function getCbbWhistleMatrixDataset(
  stats: RefStatsFile,
  scopedSeasons: string[],
  gameLogs?: RuntimeGameLogEntry[],
): CbbWhistleMatrixDataset {
  const cacheKey = whistleMatrixCacheKey(scopedSeasons);
  const store = getWorkerIsolateStore();
  const cached = store.matrixCompute.get(cacheKey) as
    | CbbWhistleMatrixDataset
    | undefined;
  if (cached) return cached;

  const logs =
    gameLogs ??
    loadRuntimeGameLogs("CBB")?.games ??
    [];
  const outliers = computeCbbWhistleMatrix(logs, scopedSeasons);
  releaseParsedPayload(logs);

  const dataset: CbbWhistleMatrixDataset = {
    version: 1,
    generatedAt: stats.meta.lastUpdated,
    minGames: NCAA_MIN_OUTLIER_GAMES,
    outliers,
  };
  store.matrixCompute.set(cacheKey, dataset);
  return dataset;
}
