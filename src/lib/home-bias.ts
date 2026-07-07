import { crewKey, formatPct, formatSigned, getTeamSplits } from "@/lib/data";
import { matchTeamString, teamFullName } from "@/lib/teams";
import type {
  AssignmentGame,
  CrewHomeBias,
  HomeBiasKind,
  RefStatsFile,
  TeamCrewSplit,
} from "@/lib/types";

const MIN_SAMPLE_GAMES = 4;
const MIN_WIN_DELTA = 0.15;
const MIN_FOUL_EDGE = 1.5;

function aggregateCrewHomeAway(
  crewKeyValue: string,
  stats: RefStatsFile,
): {
  homeGames: number;
  homeWins: number;
  awayGames: number;
  awayWins: number;
  homeFoulSum: number;
  homeFoulGames: number;
} {
  let homeGames = 0;
  let homeWins = 0;
  let awayGames = 0;
  let awayWins = 0;
  let homeFoulSum = 0;
  let homeFoulGames = 0;

  for (const splits of Object.values(stats.teamSplits)) {
    const split = splits.find((s) => s.crewKey === crewKeyValue);
    if (!split) continue;
    homeGames += split.homeGames;
    homeWins += split.homeWins;
    awayGames += split.awayGames;
    awayWins += split.awayWins;
    if (split.homeGames > 0) {
      homeFoulSum += split.foulDifferential * split.homeGames;
      homeFoulGames += split.homeGames;
    }
  }

  return {
    homeGames,
    homeWins,
    awayGames,
    awayWins,
    homeFoulSum,
    homeFoulGames,
  };
}

function classifyBias(
  homeWinRate: number | null,
  awayWinRate: number | null,
  homeFoulEdge: number | null,
): HomeBiasKind {
  const winDelta =
    homeWinRate !== null && awayWinRate !== null
      ? homeWinRate - awayWinRate
      : 0;

  if (
    winDelta >= MIN_WIN_DELTA ||
    (homeFoulEdge !== null && homeFoulEdge >= MIN_FOUL_EDGE)
  ) {
    return "home_protector";
  }
  if (
    winDelta <= -MIN_WIN_DELTA ||
    (homeFoulEdge !== null && homeFoulEdge <= -MIN_FOUL_EDGE)
  ) {
    return "road_warrior";
  }
  return "neutral";
}

function tonightHomeSplit(
  game: AssignmentGame,
  crewKeyValue: string,
): TeamCrewSplit | undefined {
  const home = matchTeamString(game.homeTeam);
  if (!home) return undefined;
  return getTeamSplits(home.abbr).find((s) => s.crewKey === crewKeyValue);
}

export function computeCrewHomeBias(
  game: AssignmentGame,
  stats: RefStatsFile,
): CrewHomeBias | null {
  const home = matchTeamString(game.homeTeam);
  if (!home) return null;

  const key = crewKey(game.crew);
  const agg = aggregateCrewHomeAway(key, stats);
  const totalGames = agg.homeGames + agg.awayGames;
  if (totalGames < MIN_SAMPLE_GAMES) return null;

  const homeWinRate =
    agg.homeGames > 0 ? agg.homeWins / agg.homeGames : null;
  const awayWinRate =
    agg.awayGames > 0 ? agg.awayWins / agg.awayGames : null;
  const homeFoulEdge =
    agg.homeFoulGames > 0 ? agg.homeFoulSum / agg.homeFoulGames : null;

  const kind = classifyBias(homeWinRate, awayWinRate, homeFoulEdge);
  const homeLabel = teamFullName(home);
  const tonightSplit = tonightHomeSplit(game, key);

  let headline: string;
  let summary: string;

  if (kind === "home_protector") {
    headline = `This crew leans home — ${home.abbr} host edge tonight`;
    summary = `Across ${totalGames} games in our sample, this crew's hosts win ${homeWinRate !== null ? formatPct(homeWinRate) : "—"} vs ${awayWinRate !== null ? formatPct(awayWinRate) : "—"} on the road${
      homeFoulEdge !== null
        ? `, with a ${formatSigned(homeFoulEdge)} home foul edge`
        : ""
    }. Not ATS — win-rate split only (no spread data yet).`;
  } else if (kind === "road_warrior") {
    headline = `Road-warrior crew — away teams fare better historically`;
    summary = `This crew's away teams win ${awayWinRate !== null ? formatPct(awayWinRate) : "—"} vs ${homeWinRate !== null ? formatPct(homeWinRate) : "—"} at home in ${totalGames} sample games. ${homeLabel} hosting tonight may not get the usual whistle cushion. Not ATS data.`;
  } else {
    headline = `Balanced crew — no strong home/road whistle skew`;
    summary = `Home and away win rates under this crew are within normal range (${homeWinRate !== null ? formatPct(homeWinRate) : "—"} home · ${awayWinRate !== null ? formatPct(awayWinRate) : "—"} away).`;
  }

  if (tonightSplit && tonightSplit.homeGames >= 2) {
    summary += ` Prior ${home.abbr} home games with this crew: ${tonightSplit.homeWins}-${tonightSplit.homeLosses}.`;
  }

  return {
    gameId: game.id,
    homeAbbr: home.abbr,
    homeLabel,
    kind,
    homeWinRate,
    awayWinRate,
    homeFoulEdge,
    sampleGames: totalGames,
    headline,
    summary,
  };
}

export function computeSlateHomeBias(
  games: AssignmentGame[],
  stats: RefStatsFile,
): CrewHomeBias[] {
  return games
    .map((game) => computeCrewHomeBias(game, stats))
    .filter((b): b is CrewHomeBias => b !== null && b.kind !== "neutral");
}

export function homeBiasTone(kind: HomeBiasKind): string {
  if (kind === "home_protector") {
    return "text-emerald-800 bg-emerald-50 border-emerald-200";
  }
  if (kind === "road_warrior") {
    return "text-sky-800 bg-sky-50 border-sky-200";
  }
  return "text-zinc-700 bg-zinc-50 border-zinc-200";
}
