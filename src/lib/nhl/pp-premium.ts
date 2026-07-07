import { getRefBySlug, refSlug } from "@/lib/nhl/data";
import { matchTeamString } from "@/lib/nhl/teams";
import { findOddsTotal } from "@/lib/nhl/odds";
import { resolveLeagueBaseline } from "@/lib/baselines";
import type {
  AssignmentGame,
  NhlPpPremiumSignal,
  NhlTeamSpecialTeams,
  OddsFile,
  RefOfficial,
  RefStatsFile,
} from "@/lib/types";

const PP_PREMIUM_THRESHOLD = 0.35;
const MIN_REF_GAMES = 25;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function refereesOnly(crew: RefOfficial[]): RefOfficial[] {
  return crew.filter((o) => o.role === "referee");
}

function specialTeamsEdge(
  homeAbbr: string,
  awayAbbr: string,
  teams: Record<string, NhlTeamSpecialTeams>,
): number {
  const home = teams[homeAbbr];
  const away = teams[awayAbbr];
  if (!home || !away) return 0;
  return home.ppPct + away.ppPct - home.pkPct - away.pkPct;
}

export function computePpPremiumSignal(
  game: AssignmentGame,
  stats: RefStatsFile,
  odds: OddsFile,
): NhlPpPremiumSignal | null {
  const teamMap = stats.meta.teamSpecialTeams;
  if (!teamMap) return null;

  const away = matchTeamString(game.awayTeam);
  const home = matchTeamString(game.homeTeam);
  if (!away || !home) return null;

  const refs = refereesOnly(game.crew);
  if (refs.length === 0) return null;

  const leagueAvgMinors =
    resolveLeagueBaseline("NHL").leagueAvgMinors ??
    stats.meta.leagueAvgMinors ??
    5.5;
  const minorRates: number[] = [];
  let sampleGames = 0;

  for (const official of refs) {
    const slug = refSlug(official.name, official.number);
    const profile = getRefBySlug(slug);
    const analytics = profile?.nhlAnalytics;
    if (!analytics || profile.games < MIN_REF_GAMES) continue;
    minorRates.push(analytics.avgMinorsPerGame);
    sampleGames = Math.max(sampleGames, profile.games);
  }

  if (minorRates.length === 0) return null;

  const refMinorRate =
    minorRates.reduce((a, b) => a + b, 0) / minorRates.length;
  const stEdge = specialTeamsEdge(home.abbr, away.abbr, teamMap);
  const minorDelta = refMinorRate - leagueAvgMinors;
  const index = round2(minorDelta * stEdge * 8);

  if (index < PP_PREMIUM_THRESHOLD) return null;

  const line = findOddsTotal(game.awayTeam, game.homeTeam, odds);
  const lineNote = line
    ? ` Book total ${line.total}.`
    : " No sportsbook total on file.";

  return {
    gameId: game.id,
    matchup: game.matchup,
    index,
    refMinorRate: round2(refMinorRate),
    specialTeamsEdge: round2(stEdge),
    sampleGames,
    headline: "PP Premium — lean Over",
    summary:
      `Ref crew averages ${refMinorRate.toFixed(1)} minors/game (${minorDelta >= 0 ? "+" : ""}${minorDelta.toFixed(1)} vs league). ` +
      `${home.abbr} + ${away.abbr} special-teams edge ${(stEdge * 100).toFixed(1)} pts (PP% minus PK%).` +
      lineNote,
  };
}

export function computeSlatePpPremiums(
  games: AssignmentGame[],
  stats: RefStatsFile,
  odds: OddsFile,
): NhlPpPremiumSignal[] {
  return games
    .map((g) => computePpPremiumSignal(g, stats, odds))
    .filter((s): s is NhlPpPremiumSignal => s !== null)
    .sort((a, b) => b.index - a.index);
}
