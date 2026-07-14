import { LEAGUES, type LeagueId } from "@/lib/leagues";
import {
  findTeamTopFinding,
  type TeamTopFinding,
} from "@/lib/insights/generator";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  computeTeamInsights,
  TEAM_INSIGHT_MIN_GAMES,
  type TeamInsight,
} from "@/lib/team-insights";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import { teamWonGameRow } from "@/lib/team-record-query";
import { winRateDeltaPoints, type TeamSampleRecord } from "@/lib/teamRecord";
import type {
  AssignmentGame,
  AssignmentsFile,
  RefGameRecord,
  RefProfile,
  TeamCrewSplit,
} from "@/lib/types";

export const HIGH_CORRELATION_WIN_DELTA = 0.1;
export const HIGH_CORRELATION_DELTA_PTS = 10;
export const SPARKLINE_GAME_LIMIT = 10;

export type RefCorrelationGroup = "high" | "neutral";

export interface TeamRefBadge {
  name: string;
  slug: string;
  winRate: number;
  deltaPts: number;
  games: number;
}

export interface TeamEdgeSummary {
  topFinding: TeamTopFinding | null;
  reliabilityScore: number;
  reliabilityLabel: string;
  bestRef: TeamRefBadge | null;
  worstRef: TeamRefBadge | null;
}

export interface RefPerformanceRow {
  slug: string;
  name: string;
  games: number;
  winRate: number;
  deltaPts: number;
  avgFoulDifferential: number;
  sparkline: number[];
  correlation: RefCorrelationGroup;
}

export interface TeamPerformanceMatrix {
  highCorrelation: RefPerformanceRow[];
  neutralCorrelation: RefPerformanceRow[];
}

export interface NextGameWatch {
  matchup: string;
  opponent: string;
  headRefName: string;
  headRefSlug?: string;
  slateDate: string;
  trendSummary: string;
  winRate: number | null;
  deltaPts: number | null;
  games: number;
  sparkline: number[];
  status: "live" | "scheduled";
}

export interface QuickAlert {
  id: string;
  title: string;
  body: string;
  severity: "high" | "medium" | "low";
  refSlug?: string;
}

export interface TeamInsightHubData {
  edgeSummary: TeamEdgeSummary;
  performanceMatrix: TeamPerformanceMatrix;
  nextGameWatch: NextGameWatch | null;
  quickAlerts: QuickAlert[];
}

export interface TeamInsightHubInput {
  league: LeagueId;
  teamAbbr: string;
  teamLabel: string;
  teamName: string;
  teamRecord: TeamSampleRecord;
  refSplits: TeamRefLeaderboardEntry[];
  refs: RefProfile[];
  crewSplits: TeamCrewSplit[];
  leagueAvgTotal: number;
  leagueOverBaseline: number;
  leagueAvgFouls: number;
  getAssignments?: () => AssignmentsFile;
  detectTeamsInGame?: (awayTeam: string, homeTeam: string) => { abbr: string }[];
  teamInsights?: TeamInsight[];
}

type SparklineGame = RefGameRecord & {
  homeScore?: number;
  awayScore?: number;
};

function isHighCorrelation(
  winRate: number,
  teamBaseline: number,
  deltaPts: number,
): boolean {
  return (
    Math.abs(winRate - teamBaseline) >= HIGH_CORRELATION_WIN_DELTA ||
    Math.abs(deltaPts) >= HIGH_CORRELATION_DELTA_PTS
  );
}

function gameEdgeValue(game: SparklineGame, teamAbbr: string): number {
  const abbr = teamAbbr.toUpperCase();
  if (game.homeScore !== undefined && game.awayScore !== undefined) {
    const won = teamWonGameRow(
      {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      },
      abbr,
    );
    if (won === true) return 1;
    if (won === false) return -1;
    return 0;
  }

  const isHome = game.homeTeam.toUpperCase() === abbr;
  const homeWhistle = game.homeMinors ?? game.homeFlags ?? 0;
  const awayWhistle = game.awayMinors ?? game.awayFlags ?? 0;
  const teamFavored = isHome
    ? awayWhistle - homeWhistle
    : homeWhistle - awayWhistle;
  if (teamFavored > 0) return 1;
  if (teamFavored < 0) return -1;
  return game.overHit ? 0.5 : -0.5;
}

export function buildRefSparkline(
  ref: RefProfile,
  teamAbbr: string,
  limit = SPARKLINE_GAME_LIMIT,
): number[] {
  const abbr = teamAbbr.toUpperCase();
  const teamGames = (ref.recentGames ?? [])
    .filter(
      (game) =>
        game.homeTeam.toUpperCase() === abbr ||
        game.awayTeam.toUpperCase() === abbr,
    )
    .slice(0, limit)
    .reverse();

  let cumulative = 0;
  const values: number[] = [];
  for (const game of teamGames) {
    cumulative += gameEdgeValue(game, abbr);
    values.push(cumulative);
  }
  return values;
}

function refBadgeFromEntry(
  entry: TeamRefLeaderboardEntry,
  teamBaseline: number,
): TeamRefBadge {
  return {
    name: entry.name,
    slug: entry.slug,
    winRate: entry.winRate,
    deltaPts: winRateDeltaPoints(entry.winRate, teamBaseline),
    games: entry.games,
  };
}

function computeReliability(refSplits: TeamRefLeaderboardEntry[]): {
  score: number;
  label: string;
} {
  if (refSplits.length === 0) {
    return { score: 0, label: "No ref samples" };
  }
  const qualified = refSplits.filter(
    (entry) => entry.games >= TEAM_REF_MIN_GAMES,
  ).length;
  const score = Math.round((qualified / refSplits.length) * 100);
  if (score >= 75) return { score, label: "High sample depth" };
  if (score >= 50) return { score, label: "Moderate sample depth" };
  return { score, label: "Thin ref samples" };
}

function buildPerformanceMatrix(
  refSplits: TeamRefLeaderboardEntry[],
  refs: RefProfile[],
  teamAbbr: string,
  teamBaseline: number,
): TeamPerformanceMatrix {
  const refBySlug = new Map(refs.map((ref) => [ref.slug, ref]));
  const rows: RefPerformanceRow[] = refSplits
    .filter((entry) => entry.games >= TEAM_INSIGHT_MIN_GAMES)
    .map((entry) => {
      const deltaPts = winRateDeltaPoints(entry.winRate, teamBaseline);
      const ref = refBySlug.get(entry.slug);
      return {
        slug: entry.slug,
        name: entry.name,
        games: entry.games,
        winRate: entry.winRate,
        deltaPts,
        avgFoulDifferential: entry.avgFoulDifferential,
        sparkline: ref ? buildRefSparkline(ref, teamAbbr) : [],
        correlation: (isHighCorrelation(entry.winRate, teamBaseline, deltaPts)
          ? "high"
          : "neutral") as RefCorrelationGroup,
      };
    })
    .sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts));

  return {
    highCorrelation: rows.filter((row) => row.correlation === "high"),
    neutralCorrelation: rows.filter((row) => row.correlation === "neutral"),
  };
}

function findRefByName(
  refs: RefProfile[],
  name: string,
): RefProfile | undefined {
  const normalized = name.trim().toLowerCase();
  return refs.find((ref) => ref.name.trim().toLowerCase() === normalized);
}

function resolveNextTeamGame(
  assignments: AssignmentsFile,
  teamAbbr: string,
  detectTeamsInGame: (awayTeam: string, homeTeam: string) => { abbr: string }[],
): { game: AssignmentGame; status: "live" | "scheduled" } | null {
  const abbr = teamAbbr.toUpperCase();
  const candidates: { game: AssignmentGame; status: "live" | "scheduled" }[] =
    [];

  for (const game of assignments.games) {
    const teams = detectTeamsInGame(game.awayTeam, game.homeTeam);
    if (teams.some((team) => team.abbr.toUpperCase() === abbr)) {
      candidates.push({
        game,
        status: game.crew.length > 0 ? "live" : "scheduled",
      });
    }
  }

  for (const game of assignments.scheduledGames ?? []) {
    const teams = detectTeamsInGame(game.awayTeam, game.homeTeam);
    if (teams.some((team) => team.abbr.toUpperCase() === abbr)) {
      candidates.push({ game, status: "scheduled" });
    }
  }

  return candidates[0] ?? null;
}

function buildNextGameWatch(
  input: TeamInsightHubInput,
): NextGameWatch | null {
  if (!input.getAssignments || !input.detectTeamsInGame) return null;

  const assignments = input.getAssignments();
  const match = resolveNextTeamGame(
    assignments,
    input.teamAbbr,
    input.detectTeamsInGame,
  );
  if (!match) return null;

  const { game, status } = match;
  const headRefName =
    game.crew.find((official) => official.role === "referee")?.name ??
    game.crew[0]?.name;
  if (!headRefName) return null;

  const headRef = findRefByName(input.refs, headRefName);
  const split = input.refSplits.find(
    (entry) => entry.slug === headRef?.slug,
  );
  const abbr = input.teamAbbr.toUpperCase();
  const teams = input.detectTeamsInGame(game.awayTeam, game.homeTeam);
  const opponent =
    teams.find((team) => team.abbr.toUpperCase() !== abbr)?.abbr ??
    (game.homeTeam.includes(input.teamName) ? game.awayTeam : game.homeTeam);

  const deltaPts = split
    ? winRateDeltaPoints(split.winRate, input.teamRecord.winRate)
    : null;
  const trendSummary = split
    ? `${formatPct(split.winRate)} in ${split.games} games (${formatSigned(deltaPts ?? 0)} pts vs team baseline)`
    : "Limited historical sample with this official";

  return {
    matchup: game.matchup,
    opponent,
    headRefName,
    headRefSlug: headRef?.slug,
    slateDate: assignments.nextSlateDate ?? assignments.date,
    trendSummary,
    winRate: split?.winRate ?? null,
    deltaPts,
    games: split?.games ?? 0,
    sparkline: headRef ? buildRefSparkline(headRef, input.teamAbbr) : [],
    status,
  };
}

function buildQuickAlerts(
  teamInsights: TeamInsight[],
  refSplits: TeamRefLeaderboardEntry[],
  teamLabel: string,
  league: LeagueId,
): QuickAlert[] {
  const metrics = LEAGUES[league].metrics;
  const alerts: QuickAlert[] = [];

  for (const insight of teamInsights) {
    if (insight.category !== "foul-edge" && insight.category !== "scoring-tilt") {
      continue;
    }
    alerts.push({
      id: `insight-${insight.id}`,
      title: insight.title,
      body: insight.body,
      severity: insight.category === "foul-edge" ? "high" : "medium",
      refSlug: insight.refSlug,
    });
  }

  const foulBaseline =
    refSplits.reduce((sum, entry) => sum + entry.avgFoulDifferential, 0) /
    Math.max(refSplits.length, 1);

  for (const entry of refSplits) {
    if (entry.games < TEAM_REF_MIN_GAMES) continue;
    const foulDelta = Math.abs(entry.avgFoulDifferential - foulBaseline);
    if (entry.avgFoulDifferential >= 2.5 || foulDelta >= 1.5) {
      alerts.push({
        id: `foul-${entry.slug}`,
        title: "Extreme whistle differential",
        body: `${entry.name} averages ${formatSigned(entry.avgFoulDifferential)} ${metrics.whistlePlain} edge per game for ${teamLabel} (${entry.games} games).`,
        severity: Math.abs(entry.avgFoulDifferential) >= 3 ? "high" : "medium",
        refSlug: entry.slug,
      });
    }
  }

  const seen = new Set<string>();
  return alerts
    .filter((alert) => {
      const key = `${alert.refSlug ?? ""}:${alert.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function buildEdgeSummary(
  input: TeamInsightHubInput,
  teamInsights: TeamInsight[],
): TeamEdgeSummary {
  const baseline = input.teamRecord.winRate;
  const qualified = input.refSplits.filter(
    (entry) => entry.games >= TEAM_REF_MIN_GAMES,
  );
  const withDelta = qualified.map((entry) => ({
    entry,
    deltaPts: winRateDeltaPoints(entry.winRate, baseline),
  }));

  const best =
    withDelta.length > 0
      ? refBadgeFromEntry(
          [...withDelta].sort((a, b) => b.deltaPts - a.deltaPts)[0]!.entry,
          baseline,
        )
      : null;
  const worst =
    withDelta.length > 0
      ? refBadgeFromEntry(
          [...withDelta].sort((a, b) => a.deltaPts - b.deltaPts)[0]!.entry,
          baseline,
        )
      : null;

  const reliability = computeReliability(input.refSplits);
  const topFinding =
    findTeamTopFinding(input.league, input.teamAbbr, teamInsights) ??
    null;

  return {
    topFinding,
    reliabilityScore: reliability.score,
    reliabilityLabel: reliability.label,
    bestRef: best && best.deltaPts > 0 ? best : null,
    worstRef: worst && worst.deltaPts < 0 ? worst : null,
  };
}

export function computeTeamInsightHub(
  input: TeamInsightHubInput,
): TeamInsightHubData {
  const teamInsights =
    input.teamInsights ??
    computeTeamInsights({
      teamAbbr: input.teamAbbr,
      teamLabel: input.teamLabel,
      teamRecord: input.teamRecord,
      crewSplits: input.crewSplits,
      refSplits: input.refSplits,
      refs: input.refs,
      leagueAvgTotal: input.leagueAvgTotal,
      leagueOverBaseline: input.leagueOverBaseline,
      leagueAvgFouls: input.leagueAvgFouls,
      league: input.league,
    });

  return {
    edgeSummary: buildEdgeSummary(input, teamInsights),
    performanceMatrix: buildPerformanceMatrix(
      input.refSplits,
      input.refs,
      input.teamAbbr,
      input.teamRecord.winRate,
    ),
    nextGameWatch: buildNextGameWatch(input),
    quickAlerts: buildQuickAlerts(
      teamInsights,
      input.refSplits,
      input.teamLabel,
      input.league,
    ),
  };
}
