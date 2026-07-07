import {
  computeCrewMetrics,
  crewKey,
  formatSigned,
  getTeamSplits,
  refSlug,
} from "@/lib/nhl/data";
import { benchmarkTotal, getOdds } from "@/lib/nhl/odds";
import { attachWhistlePremiumProvenance } from "@/lib/provenance";
import { detectTeamsInGame, matchTeamString, teamFullName } from "@/lib/nhl/teams";
import type {
  AssignmentGame,
  CrewWhistlePremium,
  OddsFile,
  PaceAlertKind,
  RefStatsFile,
  SampleQuality,
} from "@/lib/types";

const HIGH_PACE_SCORING = 0.5;
const HIGH_PACE_GAP = 0.3;
const LOW_PACE_SCORING = -0.5;
const LOW_PACE_GAP = -0.3;
const MIN_QUALIFIED_REFS = 2;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sampleQuality(
  qualifiedRefs: number,
  sampleGames: number,
  reunionGames: number,
): SampleQuality {
  if (reunionGames >= 5 && qualifiedRefs >= 2) return "strong";
  if (qualifiedRefs >= 2 && sampleGames >= 40) return "moderate";
  return "weak";
}

function teamAdjustedPremium(
  game: AssignmentGame,
  stats: RefStatsFile,
): number | null {
  const teams = detectTeamsInGame(game.awayTeam, game.homeTeam);
  if (teams.length !== 2) return null;

  const deltas: number[] = [];
  for (const official of game.crew) {
    const slug = refSlug(official.name, official.number);
    const ref = stats.refs.find((r) => r.slug === slug);
    if (!ref?.teamStats) continue;

    const teamAvgs = teams
      .map((t) => ref.teamStats![t.abbr]?.avgTotalPoints)
      .filter((v): v is number => v !== undefined);
    if (teamAvgs.length !== 2) continue;

    const refAvg = teamAvgs.reduce((a, b) => a + b, 0) / teamAvgs.length;
    deltas.push(refAvg - stats.meta.leagueAvgTotal);
  }

  if (deltas.length === 0) return null;
  return round1(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

function reunionSplitPremium(
  game: AssignmentGame,
  stats: RefStatsFile,
): { premium: number; games: number } | null {
  const key = crewKey(game.crew);
  const teams = detectTeamsInGame(game.awayTeam, game.homeTeam);
  let best: { premium: number; games: number } | null = null;

  for (const team of teams) {
    const split = getTeamSplits(team.abbr).find((s) => s.crewKey === key);
    if (!split || split.games < 2) continue;
    const premium = round1(split.avgTotalPoints - stats.meta.leagueAvgTotal);
    if (!best || split.games > best.games) {
      best = { premium, games: split.games };
    }
  }

  return best;
}

function buildAlert(
  premium: CrewWhistlePremium,
): { alert: PaceAlertKind | null; reason: string | null } {
  if (
    premium.sampleQuality === "weak" ||
    premium.qualifiedRefCount < MIN_QUALIFIED_REFS
  ) {
    return {
      alert: null,
      reason: "Sample too thin — alert suppressed until more crew history.",
    };
  }

  if (
    premium.scoringPremium >= HIGH_PACE_SCORING &&
    premium.gapVsBenchmark >= HIGH_PACE_GAP
  ) {
    const bench =
      premium.benchmarkSource === "sportsbook"
        ? `sportsbook total ${premium.benchmarkTotal}`
        : `${premium.benchmarkTotal} league proxy`;
    return {
      alert: "high_pace",
      reason: `Crew scoring premium ${formatSigned(premium.scoringPremium)} vs league; historical avg ${premium.avgTotalPoints} goals sits ${formatSigned(premium.gapVsBenchmark)} above ${bench}. Historical association only — not a bet recommendation.`,
    };
  }

  if (
    premium.scoringPremium <= LOW_PACE_SCORING &&
    premium.gapVsBenchmark <= LOW_PACE_GAP
  ) {
    const bench =
      premium.benchmarkSource === "sportsbook"
        ? `sportsbook total ${premium.benchmarkTotal}`
        : `${premium.benchmarkTotal} league proxy`;
    return {
      alert: "low_pace",
      reason: `Crew scoring premium ${formatSigned(premium.scoringPremium)} vs league; historical avg ${premium.avgTotalPoints} goals sits ${formatSigned(premium.gapVsBenchmark)} below ${bench}. Historical association only — not a bet recommendation.`,
    };
  }

  return { alert: null, reason: null };
}

export function computeCrewWhistlePremium(
  game: AssignmentGame,
  stats: RefStatsFile,
  odds: OddsFile = getOdds(),
): CrewWhistlePremium {
  const metrics = computeCrewMetrics(game.crew, stats);
  const bench = benchmarkTotal(
    game.awayTeam,
    game.homeTeam,
    stats.meta.leagueOverBaseline,
    odds,
  );
  const reunion = reunionSplitPremium(game, stats);
  const teamAdj = teamAdjustedPremium(game, stats);

  const scoringPremium = metrics.totalPointsDelta;
  const foulPremium = metrics.foulsDelta;
  const gapVsBenchmark = round1(metrics.avgTotalPoints - bench.total);

  const premium: CrewWhistlePremium = {
    gameId: game.id,
    matchup: game.matchup,
    scoringPremium,
    foulPremium,
    avgTotalPoints: metrics.avgTotalPoints,
    avgFouls: metrics.avgFouls,
    gapVsBenchmark,
    benchmarkTotal: bench.total,
    benchmarkSource: bench.source,
    teamAdjustedPremium: teamAdj,
    reunionPremium: reunion?.premium ?? null,
    reunionGames: reunion?.games ?? 0,
    sampleQuality: sampleQuality(
      metrics.qualifiedRefs.length,
      metrics.sampleGames,
      reunion?.games ?? 0,
    ),
    qualifiedRefCount: metrics.qualifiedRefs.length,
    alert: null,
    alertReason: null,
  };

  const { alert, reason } = buildAlert(premium);
  premium.alert = alert;
  premium.alertReason = reason;

  return attachWhistlePremiumProvenance(premium, stats);
}

export function computeSlatePremiums(
  games: AssignmentGame[],
  stats: RefStatsFile,
  odds?: OddsFile,
): CrewWhistlePremium[] {
  const oddsFile = odds ?? getOdds();
  return games.map((game) =>
    computeCrewWhistlePremium(game, stats, oddsFile),
  );
}

export function paceAlerts(
  premiums: CrewWhistlePremium[],
): CrewWhistlePremium[] {
  return premiums
    .filter((p) => p.alert !== null)
    .sort(
      (a, b) =>
        Math.abs(b.gapVsBenchmark) - Math.abs(a.gapVsBenchmark),
    );
}

export function formatPremiumLabel(premium: number): string {
  return `${formatSigned(premium)} whistle premium`;
}

export function premiumHeadline(premium: CrewWhistlePremium): string {
  const home = matchTeamString(premium.matchup.split("@").pop()?.trim() ?? "");
  const label = home ? teamFullName(home) : premium.matchup;
  return `${label}: ${formatPremiumLabel(premium.scoringPremium)} scoring · ${formatSigned(premium.foulPremium)} PIM`;
}
