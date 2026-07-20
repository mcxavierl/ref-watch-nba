import { loadRuntimeGameLogs } from "@/lib/game-logs";
import {
  getCachedGameLogs,
  type DataLeague,
  type RuntimeGameLogEntry,
} from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import {
  coachForTeamSeason,
  FRICTION_MATRIX_LEAGUE_IDS,
  loadPersonnelProfiles,
  starPlayersForTeamSeason,
  type CoachProfile,
  type FrictionMatrixLeagueId,
  type StarPlayerProfile,
} from "@/lib/personnel-profiles";
import type { CoachRef } from "@/lib/personnel-types";
import {
  atsCoverRateFromRecord,
  hasClosingSpreadLine,
  teamAtsResult,
} from "@/lib/team-ats";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";
import {
  identifyHighImpactLwisOutliers,
  type LwisOfficialOutlier,
} from "@/lib/whistle-disposition";
import {
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

export const FRICTION_MIN_H2H_GAMES = 15;
/** NFL crews rotate faster; max observed ref×coach overlap is ~7 games in our ingest. */
export const FRICTION_MIN_H2H_GAMES_NFL = 5;
export const FRICTION_MIN_DEVIATION_PCT = 12;

export function frictionMinHeadToHeadGames(leagueId: LeagueId): number {
  return leagueId === "nfl" ? FRICTION_MIN_H2H_GAMES_NFL : FRICTION_MIN_H2H_GAMES;
}

export type FrictionPersonnelType = "coach" | "player";
export type PlayerFrictionPattern = "protection" | "tightness" | "neutral";

export interface FrictionGrudgeFinding {
  id: string;
  personnelType: FrictionPersonnelType;
  playerPattern?: PlayerFrictionPattern;
  refSlug: string;
  refName: string;
  subjectId: string;
  subjectName: string;
  teamAbbr: string;
  games: number;
  headline: string;
  summary: string;
  comparativeLine: string;
  pillLabel: string;
  metricValue: string;
  baselineValue: string;
  deltaLabel: string;
  severity: number;
}

export interface FrictionOfficialBundle {
  refSlug: string;
  refName: string;
  findings: FrictionGrudgeFinding[];
}

/** JSON-serializable payload for Research tab RSC consumers. */
export interface FrictionMatrixDataset {
  version: 1;
  leagueId: LeagueId;
  minHeadToHeadGames: number;
  generatedAt: string;
  findings: FrictionGrudgeFinding[];
  officials: FrictionOfficialBundle[];
  /** Officials whose subjective LWIS exceeds peer mean by 2+ standard deviations. */
  highImpactOfficials: LwisOfficialOutlier[];
}

export const LWIS_HIGH_IMPACT_Z_THRESHOLD = 2;

const LEAGUE_TO_DATA: Record<(typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number], DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  wnba: "WNBA",
};

const COACH_METRIC_LABEL: Record<DataLeague, string> = {
  NBA: "technical fouls",
  NFL: "penalty flags",
  NHL: "minor penalties",
  EPL: "bookings",
  LALIGA: "bookings",
  CBB: "fouls",
  CFB: "penalties",
  WNBA: "fouls",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function frictionCacheKey(leagueId: LeagueId): string {
  return `friction-matrix:v1:${leagueId}`;
}

type ExtendedGame = RuntimeGameLogEntry & {
  homeFouls?: number;
  awayFouls?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
};

function teamFouls(game: ExtendedGame, isHome: boolean): number {
  if (isHome && game.homeFouls !== undefined) return game.homeFouls;
  if (!isHome && game.awayFouls !== undefined) return game.awayFouls;
  return game.totalFouls / 2;
}

function coachWhistleProxy(
  game: ExtendedGame,
  isHome: boolean,
  dataLeague: DataLeague,
): number {
  if (dataLeague === "NFL") {
    return isHome ? (game.homeFlags ?? 0) : (game.awayFlags ?? 0);
  }
  if (dataLeague === "NHL") {
    return isHome ? (game.homeMinors ?? 0) : (game.awayMinors ?? 0);
  }
  if (game.personnel?.homeTechnicalFouls !== undefined && isHome) {
    return game.personnel.homeTechnicalFouls;
  }
  if (game.personnel?.awayTechnicalFouls !== undefined && !isHome) {
    return game.personnel.awayTechnicalFouls;
  }
  if (isHome && game.homeYellowCards !== undefined) return game.homeYellowCards;
  if (!isHome && game.awayYellowCards !== undefined) return game.awayYellowCards;
  return 0;
}

function playerFoulDrawnProxy(
  game: ExtendedGame,
  playerTeam: string,
  dataLeague: DataLeague,
): number {
  const isHome = game.homeTeam.toUpperCase() === playerTeam.toUpperCase();
  if (dataLeague === "NFL") {
    return isHome ? (game.awayFlags ?? 0) : (game.homeFlags ?? 0);
  }
  if (dataLeague === "NHL") {
    return isHome ? (game.awayMinors ?? 0) : (game.homeMinors ?? 0);
  }
  return teamFouls(game, !isHome);
}

function resolveCoach(
  game: RuntimeGameLogEntry,
  team: string,
  season: string,
  profiles: ReturnType<typeof loadPersonnelProfiles>,
): CoachRef | null {
  const embedded =
    game.personnel?.homeCoach?.team === team.toUpperCase()
      ? game.personnel.homeCoach
      : game.personnel?.awayCoach?.team === team.toUpperCase()
        ? game.personnel.awayCoach
        : null;
  if (embedded) return embedded;
  const profile = coachForTeamSeason(profiles, team, season);
  if (!profile) return null;
  return {
    coachId: profile.coachId,
    name: profile.name,
    team: profile.team,
  };
}

interface Bucket {
  games: number;
  whistleSum: number;
  teamFoulSum: number;
  opponentFoulSum: number;
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
  /** Team abbreviations seen in shared games (for display after trades). */
  teamGameCounts: Record<string, number>;
  /** Team from the most recent shared game (preferred for display). */
  latestGameDate?: string;
  latestTeam?: string;
}

function emptyBucket(): Bucket {
  return {
    games: 0,
    whistleSum: 0,
    teamFoulSum: 0,
    opponentFoulSum: 0,
    atsWins: 0,
    atsLosses: 0,
    atsPushes: 0,
    teamGameCounts: {},
  };
}

function recordTeamGame(bucket: Bucket, team: string, gameDate?: string): void {
  const abbr = team.toUpperCase();
  bucket.teamGameCounts[abbr] = (bucket.teamGameCounts[abbr] ?? 0) + 1;
  if (gameDate && (!bucket.latestGameDate || gameDate >= bucket.latestGameDate)) {
    bucket.latestGameDate = gameDate;
    bucket.latestTeam = abbr;
  }
}

/** Prefer the most recent team; fall back to the team with the most shared games. */
export function resolveFrictionSubjectTeam(
  bucket: Pick<Bucket, "teamGameCounts" | "latestTeam">,
  fallbackTeam: string,
): string {
  if (bucket.latestTeam) return bucket.latestTeam;

  let best = fallbackTeam.toUpperCase();
  let max = 0;
  for (const [team, count] of Object.entries(bucket.teamGameCounts)) {
    if (count > max) {
      max = count;
      best = team;
    }
  }
  return best;
}

export const FRICTION_MATRIX_MAX_FINDINGS = 12;
export const FRICTION_MAX_FINDINGS_PER_SUBJECT = 2;
export const FRICTION_MIN_COACH_FINDINGS = 2;

/** Surface a varied mix of coach and player pairings instead of one dominant subject. */
export function diversifyFrictionFindings(
  findings: FrictionGrudgeFinding[],
  options?: {
    maxTotal?: number;
    maxPerSubject?: number;
    minCoaches?: number;
  },
): FrictionGrudgeFinding[] {
  const maxTotal = options?.maxTotal ?? FRICTION_MATRIX_MAX_FINDINGS;
  const maxPerSubject =
    options?.maxPerSubject ?? FRICTION_MAX_FINDINGS_PER_SUBJECT;
  const minCoaches = options?.minCoaches ?? FRICTION_MIN_COACH_FINDINGS;

  const sorted = [...findings].sort((a, b) => b.severity - a.severity);
  const selected: FrictionGrudgeFinding[] = [];
  const selectedIds = new Set<string>();
  const subjectCounts = new Map<string, number>();

  function canAdd(finding: FrictionGrudgeFinding): boolean {
    return (subjectCounts.get(finding.subjectId) ?? 0) < maxPerSubject;
  }

  function add(finding: FrictionGrudgeFinding): void {
    if (selectedIds.has(finding.id)) return;
    selected.push(finding);
    selectedIds.add(finding.id);
    subjectCounts.set(
      finding.subjectId,
      (subjectCounts.get(finding.subjectId) ?? 0) + 1,
    );
  }

  for (const finding of sorted.filter((row) => row.personnelType === "coach")) {
    if (selected.length >= maxTotal) break;
    if (!canAdd(finding)) continue;
    add(finding);
    if (
      selected.filter((row) => row.personnelType === "coach").length >= minCoaches
    ) {
      break;
    }
  }

  for (const finding of sorted) {
    if (selected.length >= maxTotal) break;
    if (selectedIds.has(finding.id)) continue;
    if (!canAdd(finding)) continue;
    add(finding);
  }

  return selected.sort((a, b) => b.severity - a.severity);
}

function addCoachGame(
  bucket: Bucket,
  game: ExtendedGame,
  coachTeam: string,
  dataLeague: DataLeague,
): void {
  const isHome = game.homeTeam.toUpperCase() === coachTeam.toUpperCase();
  recordTeamGame(bucket, coachTeam, game.date);
  bucket.games += 1;
  bucket.whistleSum += coachWhistleProxy(game, isHome, dataLeague);
  bucket.teamFoulSum += teamFouls(game, isHome);
  bucket.opponentFoulSum += teamFouls(game, !isHome);

  if (!hasClosingSpreadLine(game)) return;
  const ats = teamAtsResult(
    isHome,
    game.homeScore,
    game.awayScore,
    game.homeSpread,
    true,
  );
  if (ats === "win") bucket.atsWins += 1;
  else if (ats === "loss") bucket.atsLosses += 1;
  else if (ats === "push") bucket.atsPushes += 1;
}

function addPlayerGame(
  bucket: Bucket,
  game: ExtendedGame,
  playerTeam: string,
  dataLeague: DataLeague,
): void {
  const isHome = game.homeTeam.toUpperCase() === playerTeam.toUpperCase();
  recordTeamGame(bucket, playerTeam, game.date);
  bucket.games += 1;
  bucket.teamFoulSum += teamFouls(game, isHome);
  bucket.opponentFoulSum += playerFoulDrawnProxy(game, playerTeam, dataLeague);
}

function coachKey(refSlugValue: string, coachId: string): string {
  return `${refSlugValue}|coach|${coachId}`;
}

function playerKey(refSlugValue: string, playerId: string): string {
  return `${refSlugValue}|player|${playerId}`;
}

function finalizeAts(bucket: Bucket): number | null {
  const decisions = bucket.atsWins + bucket.atsLosses + bucket.atsPushes;
  if (decisions === 0) return null;
  return atsCoverRateFromRecord(
    bucket.atsWins,
    bucket.atsLosses,
    bucket.atsPushes,
  );
}

function passesHeadToHeadGate(games: number, leagueId: LeagueId): boolean {
  return games >= frictionMinHeadToHeadGames(leagueId);
}

function scanCoachFriction(
  refs: RefProfile[],
  coachBuckets: Map<string, Bucket & { coach: CoachRef; refSlug: string }>,
  refBaselines: Map<string, { whistle: number; fouls: number; ats: number | null }>,
  dataLeague: DataLeague,
  leagueId: LeagueId,
): FrictionGrudgeFinding[] {
  const findings: FrictionGrudgeFinding[] = [];
  const metricLabel = COACH_METRIC_LABEL[dataLeague];

  for (const bucket of coachBuckets.values()) {
    if (!passesHeadToHeadGate(bucket.games, leagueId)) continue;
    const ref = refs.find((row) => row.slug === bucket.refSlug);
    if (!ref) continue;

    const avgWhistle = bucket.whistleSum / bucket.games;
    const avgFouls = bucket.teamFoulSum / bucket.games;
    const atsRate = finalizeAts(bucket);
    const baseline = refBaselines.get(bucket.refSlug);
    if (!baseline) continue;

    const whistleDelta = avgWhistle - baseline.whistle;
    const foulDeltaPct =
      baseline.fouls > 0 ? ((avgFouls - baseline.fouls) / baseline.fouls) * 100 : 0;
    const atsDeltaPp =
      atsRate !== null && baseline.ats !== null
        ? (atsRate - baseline.ats) * 100
        : null;

    const severity = Math.max(
      Math.abs(whistleDelta) * 2,
      Math.abs(foulDeltaPct) / 10,
      Math.abs(atsDeltaPp ?? 0) / 8,
    );
    if (
      Math.abs(whistleDelta) < 0.25 &&
      Math.abs(foulDeltaPct) < FRICTION_MIN_DEVIATION_PCT &&
      Math.abs(atsDeltaPp ?? 0) < 8
    ) {
      continue;
    }

    const comparativeLine =
      atsRate !== null && baseline.ats !== null
        ? `In ${bucket.games} shared games, this official averages ${avgWhistle.toFixed(1)} ${metricLabel} and ${formatPct(atsRate)} ATS cover with ${bucket.coach.name}'s team. Career baseline with other teams: ${baseline.whistle.toFixed(1)} ${metricLabel} and ${formatPct(baseline.ats)} ATS.`
        : `In ${bucket.games} shared games, this official averages ${avgWhistle.toFixed(1)} ${metricLabel} with ${bucket.coach.name}'s team. Career baseline: ${baseline.whistle.toFixed(1)} ${metricLabel} per game.`;

    const subjectTeam = resolveFrictionSubjectTeam(bucket, bucket.coach.team);

    findings.push({
      id: `coach-friction-${bucket.refSlug}-${bucket.coach.coachId}`,
      personnelType: "coach",
      refSlug: bucket.refSlug,
      refName: ref.name,
      subjectId: bucket.coach.coachId,
      subjectName: bucket.coach.name,
      teamAbbr: subjectTeam,
      games: bucket.games,
      headline: `${ref.name} with ${bucket.coach.name}: ${whistleDelta >= 0 ? "more" : "fewer"} ${metricLabel} than ref average`,
      summary: `Coach pairing over ${bucket.games} shared games. Compares whistle volume with this coach's team to the official's career average. Descriptive only, not a prediction.`,
      comparativeLine,
      pillLabel: "Coach pairing",
      metricValue: avgWhistle.toFixed(1),
      baselineValue: baseline.whistle.toFixed(1),
      deltaLabel: `${formatSigned(whistleDelta)} ${metricLabel} vs ref baseline`,
      severity,
    });
  }

  return findings.sort((a, b) => b.severity - a.severity);
}

function scanPlayerFriction(
  refs: RefProfile[],
  playerBuckets: Map<
    string,
    Bucket & { player: StarPlayerProfile; refSlug: string }
  >,
  dataLeague: DataLeague,
  leagueId: LeagueId,
): FrictionGrudgeFinding[] {
  const findings: FrictionGrudgeFinding[] = [];
  const drawLabel =
    dataLeague === "NFL"
      ? "opponent penalty flags"
      : dataLeague === "NHL"
        ? "opponent minor penalties"
        : "opponent fouls";

  for (const bucket of playerBuckets.values()) {
    if (!passesHeadToHeadGate(bucket.games, leagueId)) continue;
    const ref = refs.find((row) => row.slug === bucket.refSlug);
    if (!ref) continue;

    const avgDrawnProxy = bucket.opponentFoulSum / bucket.games;
    const seasonAvg = bucket.player.seasonAvgFoulsDrawn ?? 4.0;
    const deltaPct = ((avgDrawnProxy - seasonAvg) / seasonAvg) * 100;
    const pattern: PlayerFrictionPattern =
      deltaPct <= -FRICTION_MIN_DEVIATION_PCT
        ? "protection"
        : deltaPct >= FRICTION_MIN_DEVIATION_PCT
          ? "tightness"
          : "neutral";
    if (pattern === "neutral") continue;

    const pillLabel =
      pattern === "protection"
        ? "Star player · fewer flags"
        : "Star player · more flags";
    const headline =
      pattern === "protection"
        ? `${ref.name} with ${bucket.player.name}: fewer opponent flags than season norm`
        : `${ref.name} with ${bucket.player.name}: more opponent flags than season norm`;

    const subjectTeam = resolveFrictionSubjectTeam(bucket, bucket.player.team);

    findings.push({
      id: `player-friction-${bucket.refSlug}-${bucket.player.playerId}`,
      personnelType: "player",
      playerPattern: pattern,
      refSlug: bucket.refSlug,
      refName: ref.name,
      subjectId: bucket.player.playerId,
      subjectName: bucket.player.name,
      teamAbbr: subjectTeam,
      games: bucket.games,
      headline,
      summary: `Team-level proxy over ${bucket.games} shared games: ${drawLabel} when ${bucket.player.name}'s team plays. Compared to ${bucket.player.name}'s seasonal average until full player box scores are ingested.`,
      comparativeLine: `${bucket.games} shared games average ${avgDrawnProxy.toFixed(1)} ${drawLabel} vs ${seasonAvg.toFixed(1)} seasonal norm (${formatSigned(deltaPct)}%).`,
      pillLabel,
      metricValue: avgDrawnProxy.toFixed(1),
      baselineValue: seasonAvg.toFixed(1),
      deltaLabel: `${formatSigned(deltaPct)}% vs seasonal baseline`,
      severity: Math.abs(deltaPct),
    });
  }

  return findings.sort((a, b) => b.severity - a.severity);
}

function groupFindingsByOfficial(
  findings: FrictionGrudgeFinding[],
): FrictionOfficialBundle[] {
  const byRef = new Map<string, FrictionOfficialBundle>();

  for (const finding of findings) {
    const existing = byRef.get(finding.refSlug);
    if (existing) {
      existing.findings.push(finding);
      continue;
    }
    byRef.set(finding.refSlug, {
      refSlug: finding.refSlug,
      refName: finding.refName,
      findings: [finding],
    });
  }

  return [...byRef.values()].sort(
    (a, b) =>
      Math.max(...b.findings.map((row) => row.severity)) -
      Math.max(...a.findings.map((row) => row.severity)),
  );
}

function aggregateFrictionFindings(
  leagueId: LeagueId,
  stats: RefStatsFile,
  allGames: RuntimeGameLogEntry[],
): FrictionGrudgeFinding[] {
  const dataLeague = LEAGUE_TO_DATA[leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  const profiles = loadPersonnelProfiles(leagueId);

  const refBaselines = new Map<
    string,
    { whistle: number; fouls: number; ats: number | null }
  >();
  const refCareerBuckets = new Map<string, Bucket>();
  const coachBuckets = new Map<
    string,
    Bucket & { coach: CoachRef; refSlug: string }
  >();
  const playerBuckets = new Map<
    string,
    Bucket & { player: StarPlayerProfile; refSlug: string }
  >();

  for (const game of allGames as ExtendedGame[]) {
    const homeCoach = resolveCoach(game, game.homeTeam, game.season, profiles);
    const awayCoach = resolveCoach(game, game.awayTeam, game.season, profiles);
    const homeStars = starPlayersForTeamSeason(
      profiles,
      game.homeTeam,
      game.season,
    );
    const awayStars = starPlayersForTeamSeason(
      profiles,
      game.awayTeam,
      game.season,
    );

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const career = refCareerBuckets.get(slug) ?? emptyBucket();
      career.games += 1;
      career.whistleSum +=
        coachWhistleProxy(game, true, dataLeague) +
        coachWhistleProxy(game, false, dataLeague);
      career.teamFoulSum += game.totalFouls;
      refCareerBuckets.set(slug, career);

      if (homeCoach) {
        const key = coachKey(slug, homeCoach.coachId);
        const bucket =
          coachBuckets.get(key) ??
          ({ ...emptyBucket(), coach: homeCoach, refSlug: slug } as Bucket & {
            coach: CoachRef;
            refSlug: string;
          });
        addCoachGame(bucket, game, homeCoach.team, dataLeague);
        coachBuckets.set(key, bucket);
      }
      if (awayCoach) {
        const key = coachKey(slug, awayCoach.coachId);
        const bucket =
          coachBuckets.get(key) ??
          ({ ...emptyBucket(), coach: awayCoach, refSlug: slug } as Bucket & {
            coach: CoachRef;
            refSlug: string;
          });
        addCoachGame(bucket, game, awayCoach.team, dataLeague);
        coachBuckets.set(key, bucket);
      }

      for (const star of [...homeStars, ...awayStars]) {
        const key = playerKey(slug, star.playerId);
        const bucket =
          playerBuckets.get(key) ??
          ({ ...emptyBucket(), player: star, refSlug: slug } as Bucket & {
            player: StarPlayerProfile;
            refSlug: string;
          });
        addPlayerGame(bucket, game, star.team, dataLeague);
        playerBuckets.set(key, bucket);
      }
    }
  }

  for (const [slug, bucket] of refCareerBuckets) {
    if (bucket.games === 0) continue;
    refBaselines.set(slug, {
      whistle: bucket.whistleSum / bucket.games / 2,
      fouls: bucket.teamFoulSum / bucket.games / 2,
      ats: null,
    });
  }

  return diversifyFrictionFindings([
    ...scanCoachFriction(
      stats.refs,
      coachBuckets,
      refBaselines,
      dataLeague,
      leagueId,
    ),
    ...scanPlayerFriction(stats.refs, playerBuckets, dataLeague, leagueId),
  ]);
}

/**
 * Core friction correlation scan. Cached per request in the worker isolate store.
 */
export function computeFrictionMatrix(
  leagueId: LeagueId,
  stats: RefStatsFile,
  gameLogs?: RuntimeGameLogEntry[] | null,
): FrictionGrudgeFinding[] {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
    return [];
  }

  const cache = getWorkerIsolateStore().matrixCompute;
  const cacheKey = frictionCacheKey(leagueId);
  const cached = cache.get(cacheKey);
  if (cached) return cached as FrictionGrudgeFinding[];

  const dataLeague = LEAGUE_TO_DATA[leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  let allGames: RuntimeGameLogEntry[] | null =
    gameLogs ??
    getCachedGameLogs(dataLeague)?.games ??
    loadRuntimeGameLogs(dataLeague)?.games ??
    null;

  if (!allGames?.length) {
    releaseParsedPayload(allGames);
    cache.set(cacheKey, []);
    return [];
  }

  try {
    const findings = aggregateFrictionFindings(leagueId, stats, allGames);
    cache.set(cacheKey, findings);
    return findings;
  } finally {
    releaseParsedPayload(allGames);
  }
}

/** Officials whose total LWIS is >2σ above the peer group (subjective WPA proxy). */
export function filterHighImpactLwisOfficials(
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
): LwisOfficialOutlier[] {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
    return [];
  }
  return identifyHighImpactLwisOutliers(stats, leagueId, scopedSeasons);
}

/** Serialized dataset for Research tab RSC layers. */
export function getFrictionMatrixDataset(
  leagueId: LeagueId,
  stats: RefStatsFile,
  gameLogs?: RuntimeGameLogEntry[] | null,
  scopedSeasons: string[] = stats.meta.seasons,
): FrictionMatrixDataset {
  const findings = computeFrictionMatrix(leagueId, stats, gameLogs);
  return {
    version: 1,
    leagueId,
    minHeadToHeadGames: frictionMinHeadToHeadGames(leagueId),
    generatedAt: new Date().toISOString(),
    findings,
    officials: groupFindingsByOfficial(findings),
    highImpactOfficials: filterHighImpactLwisOfficials(
      stats,
      leagueId,
      scopedSeasons,
    ),
  };
}

/** @deprecated Use computeFrictionMatrix — kept for existing Research imports. */
export const scanFrictionGrudgeMatrix = computeFrictionMatrix;

export function isFrictionMatrixLeague(
  leagueId: LeagueId,
): leagueId is FrictionMatrixLeagueId {
  return (FRICTION_MATRIX_LEAGUE_IDS as readonly LeagueId[]).includes(
    leagueId as FrictionMatrixLeagueId,
  );
}
