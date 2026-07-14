import type { Finding, FindingCategory } from "@/lib/findings-shared";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import { extractOfficialFromFinding } from "@/lib/finding-grouping";
import { loadLeagueOddsShard } from "@/lib/league-odds";
import type { LeagueId } from "@/lib/leagues";
import {
  computeRefWhistleDisposition,
  identifyHighImpactLwisOutliers,
  profileDisposition,
  type WhistleDispositionMetrics,
} from "@/lib/whistle-disposition";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type {
  AssignmentsFile,
  GameOddsLine,
  OddsFile,
  RefProfile,
  RefStatsFile,
} from "@/lib/types";

/** Standard -110 juice used when a priced side is absent from the odds shard. */
export const DEFAULT_STANDARD_JUICE = -110;

/** Edge score (percentage points) above which a line reads as positive EV. */
export const EDGE_POSITIVE_THRESHOLD = 2;

/** Edge score (percentage points) below which a line reads as negative EV. */
export const EDGE_NEGATIVE_THRESHOLD = -2;

export const EV_DISCLAIMER =
  "Expected Value is a statistical estimate, not a guaranteed return. Use this to identify market discrepancies, not as a source of truth.";

export type EvMarketSide = "over" | "under" | "cover";

export type FindingEvSnapshot = {
  findingId: string;
  impliedProbability: number;
  adjustedProbability: number;
  edgeScore: number;
  lwisAdjustment: number;
  marketOdds: number;
  marketLabel: string;
  marketSide: EvMarketSide;
};

export type LwisEvAdjustmentInput = {
  isHighImpactOutlier: boolean;
  favorsOver: boolean;
  historicalOverDelta: number;
  lwisPerGame?: number;
  lwisZScore?: number | null;
};

/** Convert American odds to implied probability (0–1), unsigned. */
export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds === 0) return 0.5;
  if (americanOdds < 0) {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
  return 100 / (americanOdds + 100);
}

/** Edge score in percentage points: (adjusted − implied) × 100. */
export function computeEdgeScore(
  adjustedProbability: number,
  impliedProbability: number,
): number {
  return round2((adjustedProbability - impliedProbability) * 100);
}

/**
 * LWIS-driven win-probability bump for high-impact officials who lean Over
 * in leveraged contexts. Capped to keep adjustments conservative.
 */
export function computeLwisProbabilityAdjustment(
  input: LwisEvAdjustmentInput,
): number {
  if (!input.isHighImpactOutlier || !input.favorsOver) return 0;

  const historicalBump = Math.max(0, input.historicalOverDelta) * 0.5;
  const zBoost =
    input.lwisZScore !== null && input.lwisZScore !== undefined
      ? Math.min(0.025, Math.max(0, input.lwisZScore) * 0.008)
      : 0.015;

  return round4(Math.min(0.05, historicalBump + zBoost));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

type EvLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

function whistleLeagueId(leagueId: LeagueId): EvLeagueId {
  if (leagueId === "wnba" || leagueId === "mlb") return "nba";
  return leagueId;
}

function refSlugFromHref(href: string): string | null {
  const match = href.match(/\/refs\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

function resolveRefFromFinding(
  finding: Finding,
  stats: RefStatsFile,
): RefProfile | null {
  const official = extractOfficialFromFinding(finding);
  if (official) {
    return stats.refs.find((ref) => ref.slug === official.key) ?? null;
  }
  const slug = finding.links
    .map((link) => refSlugFromHref(link.href))
    .find(Boolean);
  if (!slug) return null;
  return stats.refs.find((ref) => ref.slug === slug) ?? null;
}

function marketSideForCategory(
  category: FindingCategory,
  favorsOver: boolean,
): EvMarketSide | null {
  if (category === "ou-edge" || category === "ref-outlier") {
    return favorsOver ? "over" : "under";
  }
  if (category === "ats-edge") return "cover";
  return null;
}

function favorsOverFromRef(ref: RefProfile, category: FindingCategory): boolean {
  if (category === "ats-edge") {
    const record = ref.bettingStats?.homeTeamAts;
    if (record) {
      const games = record.wins + record.losses + record.pushes;
      if (games > 0) return record.wins / games >= 0.5;
    }
    return ref.overRate >= 0.5;
  }

  const ouRecord = ref.bettingStats?.overUnder?.overall;
  if (ouRecord) {
    const games = ouRecord.wins + ouRecord.losses + ouRecord.pushes;
    if (games > 0) return ouRecord.wins / games >= 0.5;
  }
  return ref.overRate >= 0.5;
}

function baselineModelProbability(
  ref: RefProfile,
  category: FindingCategory,
  leagueOverBaseline: number,
): number {
  if (category === "ats-edge") {
    const record = ref.bettingStats?.homeTeamAts;
    if (record) {
      const games = record.wins + record.losses + record.pushes;
      if (games > 0) return record.wins / games;
    }
    return 0.5;
  }

  const ouRecord = ref.bettingStats?.overUnder?.overall;
  if (ouRecord) {
    const games = ouRecord.wins + ouRecord.losses + ouRecord.pushes;
    if (games > 0) return ouRecord.wins / games;
  }

  return ref.overRate;
}

function historicalOverDelta(ref: RefProfile, leagueOverBaseline: number): number {
  return Math.max(0, ref.overRate - leagueOverBaseline);
}

function pricedAmericanOdds(
  line: GameOddsLine | undefined,
  side: EvMarketSide,
): number {
  if (!line) return DEFAULT_STANDARD_JUICE;
  if (side === "over" && line.overOdds !== undefined) return line.overOdds;
  if (side === "under" && line.underOdds !== undefined) return line.underOdds;
  if (side === "cover" && line.homeSpreadOdds !== undefined) {
    return line.homeSpreadOdds;
  }
  return DEFAULT_STANDARD_JUICE;
}

function findRefAssignmentLine(
  refSlug: string,
  assignments: AssignmentsFile | undefined,
  odds: OddsFile,
): GameOddsLine | undefined {
  if (!assignments?.games?.length || !odds.lines.length) return undefined;

  const slugBase = (name: string, number: number) =>
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${number}`;

  for (const game of assignments.games) {
    const onCrew = game.crew.some(
      (official) => slugBase(official.name, official.number) === refSlug,
    );
    if (!onCrew) continue;

    return odds.lines.find(
      (line) =>
        line.awayTeam === game.awayTeam && line.homeTeam === game.homeTeam,
    );
  }

  return undefined;
}

function dispositionForRef(
  ref: RefProfile,
  leagueId: EvLeagueId,
  scopedSeasons: string[],
  highImpactSlugs: Set<string>,
): WhistleDispositionMetrics | null {
  if (!isWhistleTaxonomyLeague(leagueId)) return null;

  const metrics =
    computeRefWhistleDisposition(ref, leagueId, scopedSeasons) ??
    profileDisposition(ref, leagueId);
  if (!metrics) return null;
  return {
    ...metrics,
    isHighImpactOutlier: highImpactSlugs.has(ref.slug),
  };
}

export function computeFindingEvSnapshot(
  finding: Finding,
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  options?: {
    odds?: OddsFile;
    assignments?: AssignmentsFile;
    highImpactSlugs?: Set<string>;
  },
): FindingEvSnapshot | null {
  const ref = resolveRefFromFinding(finding, stats);
  if (!ref) return null;

  const evLeagueId = whistleLeagueId(leagueId);

  const favorsOver = favorsOverFromRef(ref, finding.category);
  const marketSide = marketSideForCategory(finding.category, favorsOver);
  if (!marketSide) return null;

  const odds = options?.odds ?? loadLeagueOddsShard(leagueId);
  const line = findRefAssignmentLine(
    ref.slug,
    options?.assignments,
    odds,
  );
  const marketOdds = pricedAmericanOdds(line, marketSide);
  const impliedProbability = americanToImpliedProbability(marketOdds);

  const baselineProbability = baselineModelProbability(
    ref,
    finding.category,
    stats.meta.leagueOverBaseline,
  );

  const highImpactSlugs = options?.highImpactSlugs;
  const disposition = dispositionForRef(
    ref,
    evLeagueId,
    scopedSeasons,
    highImpactSlugs ?? new Set(),
  );

  const lwisAdjustment = computeLwisProbabilityAdjustment({
    isHighImpactOutlier: disposition?.isHighImpactOutlier ?? false,
    favorsOver,
    historicalOverDelta: historicalOverDelta(
      ref,
      stats.meta.leagueOverBaseline,
    ),
    lwisPerGame: disposition?.lwisPerGame,
    lwisZScore: disposition?.lwisZScore,
  });

  const adjustedProbability = round4(
    Math.min(0.99, Math.max(0.01, baselineProbability + lwisAdjustment)),
  );
  const edgeScore = computeEdgeScore(adjustedProbability, impliedProbability);

  const marketLabel =
    marketSide === "cover"
      ? "Home ATS"
      : marketSide === "over"
        ? "Over"
        : "Under";

  return {
    findingId: finding.id,
    impliedProbability,
    adjustedProbability,
    edgeScore,
    lwisAdjustment,
    marketOdds,
    marketLabel,
    marketSide,
  };
}

/** Request-scoped EV map for the Research Pro view. */
export function buildResearchFindingEvMap(
  findings: Finding[],
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  assignments?: AssignmentsFile,
): Record<string, FindingEvSnapshot | null> {
  const cacheKey = [
    "research-ev-map:v1",
    leagueId,
    [...scopedSeasons].sort().join(","),
    stats.meta.lastUpdated,
    findings.map((row) => row.id).join(","),
    assignments?.lastUpdated ?? "none",
  ].join("|");

  const cached = getWorkerIsolateStore().matrixCompute.get(cacheKey);
  if (cached) return cached as Record<string, FindingEvSnapshot | null>;

  const odds = loadLeagueOddsShard(leagueId);
  const evLeagueId = whistleLeagueId(leagueId);
  const highImpactSlugs = new Set(
    isWhistleTaxonomyLeague(evLeagueId)
      ? identifyHighImpactLwisOutliers(stats, evLeagueId, scopedSeasons).map(
          (row) => row.refSlug,
        )
      : [],
  );

  const map: Record<string, FindingEvSnapshot | null> = {};
  for (const finding of findings) {
    map[finding.id] = computeFindingEvSnapshot(
      finding,
      stats,
      leagueId,
      scopedSeasons,
      { odds, assignments, highImpactSlugs },
    );
  }

  getWorkerIsolateStore().matrixCompute.set(cacheKey, map);
  return map;
}

export function pickStrongestEvSnapshot(
  snapshots: Array<FindingEvSnapshot | null | undefined>,
): FindingEvSnapshot | null {
  let best: FindingEvSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    if (!best || Math.abs(snapshot.edgeScore) > Math.abs(best.edgeScore)) {
      best = snapshot;
    }
  }
  return best;
}

export function edgeTone(
  edgeScore: number,
): "positive" | "negative" | "neutral" {
  if (edgeScore > EDGE_POSITIVE_THRESHOLD) return "positive";
  if (edgeScore < EDGE_NEGATIVE_THRESHOLD) return "negative";
  return "neutral";
}
