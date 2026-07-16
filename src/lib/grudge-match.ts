import {
  crewKey,
  formatPct,
  formatSigned,
  getRefStats,
  getTeamSplits,
  refSlug,
} from "@/lib/data";
import { DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import { formatWinRateVsTeam } from "@/lib/stats-utils";
import { getTeam, matchTeamString, teamFullName, teamWithArticle } from "@/lib/teams";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";
import { getTeamDisplayRecord } from "@/lib/teamDisplayRecord";
import { winRateDeltaPoints } from "@/lib/teamRecord";
import type {
  AssignmentGame,
  AssignmentsFile,
  RefOfficial,
  RefProfile,
  RefStatsFile,
  RefTeamStat,
  TeamCrewSplit,
} from "@/lib/types";

export type GrudgeStorylineKind =
  | "win-rate-curse"
  | "win-rate-boost"
  | "foul-spike"
  | "foul-relief"
  | "foul-edge-paradox"
  | "scoring-hot"
  | "scoring-cold"
  | "crew-reunion"
  | "ref-split";

export interface GrudgeStoryline {
  id: string;
  gameId: string;
  kind: GrudgeStorylineKind;
  severity: number;
  headline: string;
  summary: string;
  stats: { label: string; value: string; detail?: string }[];
  sampleNote: string;
  links: { label: string; href: string }[];
}

interface TeamContext {
  abbr: string;
  label: string;
  article: string;
  splits: TeamCrewSplit[];
  baseline: ReturnType<typeof getTeamDisplayRecord>;
  baselineFouls: number;
}

const MIN_GAMES = TEAM_REF_MIN_GAMES;
const MIN_WIN_DELTA = 10;
const MIN_FOUL_PCT = 12;
const MIN_FOUL_EDGE = 2;
const MAX_PARADOX_WIN = 0.38;

function teamContext(abbr: string): TeamContext | null {
  const team = getTeam(abbr);
  if (!team) return null;
  const splits = getTeamSplits(abbr);
  const stats = getRefStats();
  return {
    abbr,
    label: teamFullName(team),
    article: teamWithArticle(team),
    splits,
    baseline: getTeamDisplayRecord("nba", abbr, splits, stats.meta.seasons, {
      sinceSeason: DEFAULT_SINCE_SEASON,
    }),
    baselineFouls: weightedTeamFouls(splits),
  };
}

function weightedTeamFouls(splits: TeamCrewSplit[]): number {
  let games = 0;
  let sum = 0;
  for (const split of splits) {
    sum += split.avgTeamFouls * split.games;
    games += split.games;
  }
  return games > 0 ? sum / games : 0;
}

function refTeamFouls(
  refSlugValue: string,
  splits: TeamCrewSplit[],
): { avg: number; games: number } | null {
  let games = 0;
  let sum = 0;
  for (const split of splits) {
    if (!split.crewKey.split("|").includes(refSlugValue)) continue;
    sum += split.avgTeamFouls * split.games;
    games += split.games;
  }
  if (games < MIN_GAMES) return null;
  return { avg: sum / games, games };
}

function approxRecord(games: number, winRate: number): { wins: number; losses: number } {
  const wins = Math.round(winRate * games);
  return { wins, losses: Math.max(0, games - wins) };
}

function foulPctChange(refAvg: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return ((refAvg - baseline) / baseline) * 100;
}

function severityFromSample(games: number, base: number): number {
  return base * Math.min(1.5, Math.log10(games + 1));
}

function winRateStoryline(
  gameId: string,
  ref: RefProfile,
  team: TeamContext,
  stat: RefTeamStat,
): GrudgeStoryline | null {
  if (stat.games < MIN_GAMES) return null;
  const delta = winRateDeltaPoints(stat.winRate, team.baseline.winRate);
  if (Math.abs(delta) < MIN_WIN_DELTA) return null;

  const { wins, losses } = approxRecord(stat.games, stat.winRate);
  const kind: GrudgeStorylineKind =
    delta < 0 ? "win-rate-curse" : "win-rate-boost";
  const severity = severityFromSample(stat.games, Math.abs(delta));

  return {
    id: `${gameId}-${kind}-${ref.slug}-${team.abbr}`,
    gameId,
    kind,
    severity,
    headline: `${ref.name} tonight; ${team.label} are ${wins}-${losses} in his games`,
    summary: `In this dataset, ${team.article} win ${formatPct(stat.winRate)} of games with ${ref.name} officiating (${stat.games} games). That is ${formatWinRateVsTeam(stat.winRate, team.baseline.winRate).replace(" pts vs team", " percentage points")} than their ${formatPct(team.baseline.winRate)} baseline across all crews.`,
    stats: [
      {
        label: "Record with ref",
        value: `${wins}-${losses}`,
        detail: `${stat.games} games in sample`,
      },
      {
        label: "Win rate",
        value: formatPct(stat.winRate),
        detail: `Team baseline ${formatPct(team.baseline.winRate)}`,
      },
      {
        label: "Foul edge",
        value: formatSigned(stat.avgFoulDifferential),
        detail: `${formatPct(stat.overRate)} over 225`,
      },
    ],
    sampleNote: `${stat.games} ${team.abbr} games with ${ref.name} · regular season sample`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: team.label, href: `/teams/${team.abbr}` },
    ],
  };
}

function foulSpikeStoryline(
  gameId: string,
  ref: RefProfile,
  team: TeamContext,
): GrudgeStoryline | null {
  const refFouls = refTeamFouls(ref.slug, team.splits);
  if (!refFouls || team.baselineFouls <= 0) return null;

  const pct = foulPctChange(refFouls.avg, team.baselineFouls);
  if (Math.abs(pct) < MIN_FOUL_PCT) return null;

  const kind: GrudgeStorylineKind = pct > 0 ? "foul-spike" : "foul-relief";
  const severity = severityFromSample(refFouls.games, Math.abs(pct));

  return {
    id: `${gameId}-${kind}-${ref.slug}-${team.abbr}`,
    gameId,
    kind,
    severity,
    headline: `${ref.name} whistles ${team.label} ${Math.abs(Math.round(pct))}% ${pct > 0 ? "more" : "less"} than usual`,
    summary: `When ${ref.name} is on the court, ${team.article} commit ${refFouls.avg.toFixed(1)} fouls per game, ${Math.abs(Math.round(pct))}% ${pct > 0 ? "above" : "below"} their ${team.baselineFouls.toFixed(1)} average in this dataset. That is raw foul volume, not a betting line.`,
    stats: [
      {
        label: "Fouls with ref",
        value: refFouls.avg.toFixed(1),
        detail: `${refFouls.games} games`,
      },
      {
        label: "Team baseline",
        value: team.baselineFouls.toFixed(1),
        detail: "Weighted across all crews",
      },
      {
        label: "Change",
        value: `${pct > 0 ? "+" : ""}${Math.round(pct)}%`,
        detail: formatSigned(
          Math.round((refFouls.avg - team.baselineFouls) * 10) / 10,
        ),
      },
    ],
    sampleNote: `${refFouls.games} ${team.abbr} games with ${ref.name} in sample`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: team.label, href: `/teams/${team.abbr}` },
    ],
  };
}

function foulEdgeParadoxStoryline(
  gameId: string,
  ref: RefProfile,
  team: TeamContext,
  stat: RefTeamStat,
): GrudgeStoryline | null {
  if (
    stat.games < MIN_GAMES + 3 ||
    stat.avgFoulDifferential < MIN_FOUL_EDGE ||
    stat.winRate > MAX_PARADOX_WIN
  ) {
    return null;
  }

  const { wins, losses } = approxRecord(stat.games, stat.winRate);
  const severity = severityFromSample(
    stat.games,
    stat.avgFoulDifferential * 10 + (MAX_PARADOX_WIN - stat.winRate) * 100,
  );

  return {
    id: `${gameId}-foul-edge-paradox-${ref.slug}-${team.abbr}`,
    gameId,
    kind: "foul-edge-paradox",
    severity,
    headline: `${ref.name} helps ${team.label} on fouls, they still lose`,
    summary: `${ref.name} gives ${team.article} a ${formatSigned(stat.avgFoulDifferential)} foul edge per game, but they are only ${wins}-${losses} (${formatPct(stat.winRate)}) in those matchups. The whistle tilt and the scoreboard pull in opposite directions.`,
    stats: [
      {
        label: "Foul edge",
        value: formatSigned(stat.avgFoulDifferential),
        detail: "Team minus opponent fouls",
      },
      {
        label: "Win rate",
        value: formatPct(stat.winRate),
        detail: `${wins}-${losses} record`,
      },
      {
        label: "Avg total",
        value: String(stat.avgTotalPoints),
        detail: `${formatPct(stat.overRate)} over 225`,
      },
    ],
    sampleNote: `${stat.games} ${team.abbr} games · min ${MIN_GAMES + 3} sample`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: team.label, href: `/teams/${team.abbr}` },
    ],
  };
}

function scoringStoryline(
  gameId: string,
  ref: RefProfile,
  team: TeamContext,
  stat: RefTeamStat,
  leagueOverBaseline: number,
): GrudgeStoryline | null {
  if (stat.games < MIN_GAMES) return null;

  let kind: GrudgeStorylineKind | null = null;
  if (stat.overRate >= 0.62 || stat.avgTotalPoints >= leagueOverBaseline + 6) {
    kind = "scoring-hot";
  } else if (
    stat.overRate <= 0.32 ||
    stat.avgTotalPoints <= leagueOverBaseline - 8
  ) {
    kind = "scoring-cold";
  }
  if (!kind) return null;

  const severity = severityFromSample(
    stat.games,
    kind === "scoring-hot"
      ? stat.overRate * 100 - 50
      : 50 - stat.overRate * 100,
  );

  return {
    id: `${gameId}-${kind}-${ref.slug}-${team.abbr}`,
    gameId,
    kind,
    severity,
    headline: `${ref.name} ${kind === "scoring-hot" ? "runs hot" : "runs cold"} on totals with ${team.label}`,
    summary: `Games with ${ref.name} and ${team.article} average ${stat.avgTotalPoints} combined points, with ${formatPct(stat.overRate)} finishing above ${leagueOverBaseline}. ${
      kind === "scoring-hot"
        ? "That is one of the higher-scoring ref–team environments on tonight's card."
        : "That is one of the lower-scoring ref–team environments on tonight's card."
    }`,
    stats: [
      {
        label: "Avg total",
        value: String(stat.avgTotalPoints),
        detail: `${stat.games} games`,
      },
      {
        label: `Over ${leagueOverBaseline}`,
        value: formatPct(stat.overRate),
        detail: "Historical frequency",
      },
      {
        label: "Win rate",
        value: formatPct(stat.winRate),
        detail: formatWinRateVsTeam(stat.winRate, team.baseline.winRate),
      },
    ],
    sampleNote: `${stat.games} ${team.abbr} games with ${ref.name}`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: team.label, href: `/teams/${team.abbr}` },
    ],
  };
}

function crewReunionStoryline(
  gameId: string,
  game: AssignmentGame,
  team: TeamContext,
  key: string,
): GrudgeStoryline | null {
  const split = team.splits.find((s) => s.crewKey === key);
  if (!split || split.games < 2) return null;

  const severity = severityFromSample(
    split.games,
    Math.abs(split.totalDelta) + Math.abs(split.foulDifferential) * 5,
  );

  return {
    id: `${gameId}-crew-reunion-${team.abbr}`,
    gameId,
    kind: "crew-reunion",
    severity,
    headline: `This exact crew went ${split.wins}-${split.losses} with ${team.label} before`,
    summary: `The same three officials worked ${split.games} prior ${team.label} games in this dataset, ${split.avgTotalPoints} avg combined score, ${formatSigned(split.foulDifferential)} foul edge, ${formatPct(split.overRate)} over ${225}.`,
    stats: [
      {
        label: "Prior record",
        value: `${split.wins}-${split.losses}`,
        detail: `${split.games} games`,
      },
      {
        label: "Avg total",
        value: String(split.avgTotalPoints),
        detail: formatSigned(split.totalDelta) + " vs league",
      },
      {
        label: "Foul edge",
        value: formatSigned(split.foulDifferential),
        detail: `${split.avgTeamFouls} team · ${split.avgOpponentFouls} opp`,
      },
    ],
    sampleNote: `${split.games} prior ${team.abbr} games with this crew`,
    links: [{ label: team.label, href: `/teams/${team.abbr}` }],
  };
}

function refSplitStoryline(
  gameId: string,
  ref: RefProfile,
  home: TeamContext,
  away: TeamContext,
  homeStat: RefTeamStat,
  awayStat: RefTeamStat,
): GrudgeStoryline | null {
  if (homeStat.games < MIN_GAMES || awayStat.games < MIN_GAMES) return null;
  const spread = homeStat.avgFoulDifferential - awayStat.avgFoulDifferential;
  if (spread < 4) return null;

  const severity = severityFromSample(
    homeStat.games + awayStat.games,
    spread * 8,
  );

  return {
    id: `${gameId}-ref-split-${ref.slug}`,
    gameId,
    kind: "ref-split",
    severity,
    headline: `${ref.name} whistles ${home.label} and ${away.label} very differently`,
    summary: `Tonight's matchup puts two teams on the same card with very different histories under ${ref.name}: ${home.label} see a ${formatSigned(homeStat.avgFoulDifferential)} foul edge while ${away.label} see ${formatSigned(awayStat.avgFoulDifferential)}, a ${spread.toFixed(1)}-foul swing.`,
    stats: [
      {
        label: `${home.abbr} foul edge`,
        value: formatSigned(homeStat.avgFoulDifferential),
        detail: `${formatPct(homeStat.winRate)} wins · ${homeStat.games}g`,
      },
      {
        label: `${away.abbr} foul edge`,
        value: formatSigned(awayStat.avgFoulDifferential),
        detail: `${formatPct(awayStat.winRate)} wins · ${awayStat.games}g`,
      },
      {
        label: "Swing",
        value: spread.toFixed(1),
        detail: "Foul differential gap",
      },
    ],
    sampleNote: `${homeStat.games}+${awayStat.games} games across both teams`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: home.label, href: `/teams/${home.abbr}` },
      { label: away.label, href: `/teams/${away.abbr}` },
    ],
  };
}

function storylinesForGame(
  game: AssignmentGame,
  stats: RefStatsFile,
): GrudgeStoryline[] {
  const awayAbbr = matchTeamString(game.awayTeam)?.abbr;
  const homeAbbr = matchTeamString(game.homeTeam)?.abbr;
  const contexts = [awayAbbr, homeAbbr]
    .filter((abbr): abbr is string => !!abbr)
    .map((abbr) => teamContext(abbr))
    .filter((ctx): ctx is TeamContext => !!ctx);

  if (contexts.length === 0) return [];

  const candidates: GrudgeStoryline[] = [];
  const crewKeyValue = crewKey(game.crew);

  for (const official of game.crew) {
    const slug = refSlug(official.name, official.number);
    const ref = stats.refs.find((r) => r.slug === slug);
    if (!ref?.teamStats) continue;

    for (const ctx of contexts) {
      const teamStat = ref.teamStats[ctx.abbr];
      if (!teamStat) continue;

      const win = winRateStoryline(game.id, ref, ctx, teamStat);
      if (win) candidates.push(win);

      const foul = foulSpikeStoryline(game.id, ref, ctx);
      if (foul) candidates.push(foul);

      const paradox = foulEdgeParadoxStoryline(game.id, ref, ctx, teamStat);
      if (paradox) candidates.push(paradox);

      const scoring = scoringStoryline(
        game.id,
        ref,
        ctx,
        teamStat,
        stats.meta.leagueOverBaseline,
      );
      if (scoring) candidates.push(scoring);
    }

    if (contexts.length === 2 && homeAbbr && awayAbbr) {
      const homeCtx = teamContext(homeAbbr);
      const awayCtx = teamContext(awayAbbr);
      if (!homeCtx || !awayCtx) continue;
      const homeStat = ref.teamStats[homeCtx.abbr];
      const awayStat = ref.teamStats[awayCtx.abbr];
      if (homeStat && awayStat) {
        const split = refSplitStoryline(
          game.id,
          ref,
          homeCtx,
          awayCtx,
          homeStat,
          awayStat,
        );
        if (split) candidates.push(split);
      }
    }
  }

  for (const ctx of contexts) {
    const reunion = crewReunionStoryline(game.id, game, ctx, crewKeyValue);
    if (reunion) candidates.push(reunion);
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.severity - a.severity)
    .filter((story) => {
      const key = `${story.kind}-${story.headline.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function computeGameStorylines(
  game: AssignmentGame,
  stats: RefStatsFile,
  limit = 2,
): GrudgeStoryline[] {
  return storylinesForGame(game, stats).slice(0, limit);
}

export function computeSlateStorylines(
  games: AssignmentGame[],
  stats: RefStatsFile,
  limit = 8,
): GrudgeStoryline[] {
  const all = games.flatMap((game) => storylinesForGame(game, stats));
  const seen = new Set<string>();
  return all
    .sort((a, b) => b.severity - a.severity)
    .filter((story) => {
      if (seen.has(story.id)) return false;
      seen.add(story.id);
      return true;
    })
    .slice(0, limit);
}

function officialsFromSplit(
  split: TeamCrewSplit,
  stats: RefStatsFile,
): RefOfficial[] {
  const roles: RefOfficial["role"][] = ["crew_chief", "referee", "umpire"];
  return split.crewNames.map((name, index) => {
    const profile = stats.refs.find((r) => r.name === name);
    return {
      name,
      number: profile?.number ?? 0,
      role: roles[index] ?? "referee",
    };
  });
}

/** Off-season preview: build sample games from the strongest ref–team anomalies. */
export function buildPreviewSlate(stats: RefStatsFile): AssignmentGame[] {
  const candidates: {
    severity: number;
    ref: RefProfile;
    teamAbbr: string;
    opponentAbbr: string;
    crew: RefOfficial[];
  }[] = [];

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [teamAbbr, teamStat] of Object.entries(ref.teamStats)) {
      if (teamStat.games < MIN_GAMES) continue;
      const ctx = teamContext(teamAbbr);
      if (!ctx) continue;

      const delta = Math.abs(
        winRateDeltaPoints(teamStat.winRate, ctx.baseline.winRate),
      );
      const foul = refTeamFouls(ref.slug, ctx.splits);
      const foulPct = foul
        ? Math.abs(foulPctChange(foul.avg, ctx.baselineFouls))
        : 0;
      const severity = Math.max(delta, foulPct, teamStat.avgFoulDifferential * 8);
      if (severity < MIN_WIN_DELTA) continue;

      const split = ctx.splits.find((s) => s.crewKey.includes(ref.slug));
      if (!split) continue;

      const opponentAbbr =
        Object.keys(ref.teamStats).find(
          (abbr) => abbr !== teamAbbr && ref.teamStats![abbr].games >= MIN_GAMES,
        ) ?? "BOS";

      candidates.push({
        severity,
        ref,
        teamAbbr,
        opponentAbbr,
        crew: officialsFromSplit(split, stats),
      });
    }
  }

  const picked: AssignmentGame[] = [];
  const usedPairs = new Set<string>();

  for (const item of candidates.sort((a, b) => b.severity - a.severity)) {
    if (picked.length >= 3) break;
    const pairKey = [item.teamAbbr, item.opponentAbbr].sort().join("-");
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const home = getTeam(item.teamAbbr)!;
    const away = getTeam(item.opponentAbbr)!;

    picked.push({
      id: `preview-${item.ref.slug}-${item.teamAbbr}`,
      matchup: `${teamFullName(away)} @ ${teamFullName(home)}`,
      awayTeam: teamFullName(away),
      homeTeam: teamFullName(home),
      league: "NBA",
      crew: item.crew,
    });
  }

  return picked;
}

export function resolveSlateGames(
  assignments: AssignmentsFile,
): { games: AssignmentGame[]; isPreview: boolean } {
  const withCrew = assignments.games.filter((game) => game.crew.length > 0);
  if (withCrew.length > 0) {
    return { games: withCrew, isPreview: false };
  }
  return { games: [], isPreview: false };
}
