import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";

/** Minimum league-wide games before a crew appears on the dominance page. */
export const CREW_DOMINANCE_MIN_GAMES = 8;

/** Minimum games for a member's non-crew baseline to count toward dominance. */
const MEMBER_OTHER_CREW_MIN_GAMES = 5;

export type CrewDominanceSort =
  | "games-desc"
  | "scoring-desc"
  | "scoring-asc"
  | "whistle-desc"
  | "whistle-asc"
  | "dominance-scoring-desc"
  | "dominance-whistle-desc";

export const CREW_DOMINANCE_SORT_OPTIONS: {
  value: CrewDominanceSort;
  label: string;
}[] = [
  { value: "games-desc", label: "Most games" },
  { value: "scoring-desc", label: "Scoring pace (high → low)" },
  { value: "scoring-asc", label: "Scoring pace (low → high)" },
  { value: "whistle-desc", label: "Whistle rate (high → low)" },
  { value: "whistle-asc", label: "Whistle rate (low → high)" },
  { value: "dominance-scoring-desc", label: "Scoring dominance" },
  { value: "dominance-whistle-desc", label: "Whistle dominance" },
];

export interface CrewDominanceEntry {
  crewKey: string;
  crewNames: string[];
  memberSlugs: string[];
  games: number;
  avgTotalPoints: number;
  scoringDelta: number;
  avgFouls: number;
  whistleDelta: number;
  overRate: number;
  dominanceScoringDelta: number | null;
  dominanceWhistleDelta: number | null;
  teamCount: number;
}

interface CrewAccumulator {
  crewKey: string;
  crewNames: string[];
  games: number;
  totalPointsSum: number;
  foulsSum: number;
  overs: number;
  teamAbbrs: Set<string>;
}

interface MemberOtherCrewAcc {
  scoringSum: number;
  scoringGames: number;
  whistleSum: number;
  whistleGames: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function flattenTeamSplits(
  teamSplits: Record<string, TeamCrewSplit[]>,
): TeamCrewSplit[] {
  const all: TeamCrewSplit[] = [];
  for (const splits of Object.values(teamSplits)) {
    all.push(...splits);
  }
  return all;
}

function aggregateCrews(
  teamSplits: Record<string, TeamCrewSplit[]>,
): Map<string, CrewAccumulator> {
  const crews = new Map<string, CrewAccumulator>();

  for (const [abbr, splits] of Object.entries(teamSplits)) {
    for (const split of splits) {
      let acc = crews.get(split.crewKey);
      if (!acc) {
        acc = {
          crewKey: split.crewKey,
          crewNames: split.crewNames,
          games: 0,
          totalPointsSum: 0,
          foulsSum: 0,
          overs: 0,
          teamAbbrs: new Set(),
        };
        crews.set(split.crewKey, acc);
      }
      acc.games += split.games;
      acc.totalPointsSum += split.avgTotalPoints * split.games;
      acc.foulsSum += split.avgFouls * split.games;
      acc.overs += split.overRate * split.games;
      acc.teamAbbrs.add(abbr.toUpperCase());
    }
  }

  return crews;
}

function memberOtherCrewBaselines(
  allSplits: TeamCrewSplit[],
  crewKey: string,
  memberSlugs: string[],
): { scoring: number | null; whistle: number | null } {
  const accByMember = new Map<string, MemberOtherCrewAcc>();
  for (const slug of memberSlugs) {
    accByMember.set(slug, {
      scoringSum: 0,
      scoringGames: 0,
      whistleSum: 0,
      whistleGames: 0,
    });
  }

  for (const split of allSplits) {
    if (split.crewKey === crewKey) continue;
    const members = new Set(split.crewKey.split("|"));
    for (const slug of memberSlugs) {
      if (!members.has(slug)) continue;
      const acc = accByMember.get(slug)!;
      acc.scoringSum += split.avgTotalPoints * split.games;
      acc.scoringGames += split.games;
      acc.whistleSum += split.avgFouls * split.games;
      acc.whistleGames += split.games;
    }
  }

  const scoringVals: number[] = [];
  const whistleVals: number[] = [];
  for (const acc of accByMember.values()) {
    if (acc.scoringGames >= MEMBER_OTHER_CREW_MIN_GAMES) {
      scoringVals.push(acc.scoringSum / acc.scoringGames);
    }
    if (acc.whistleGames >= MEMBER_OTHER_CREW_MIN_GAMES) {
      whistleVals.push(acc.whistleSum / acc.whistleGames);
    }
  }

  if (scoringVals.length === 0 && whistleVals.length === 0) {
    return { scoring: null, whistle: null };
  }

  return {
    scoring:
      scoringVals.length > 0
        ? scoringVals.reduce((s, v) => s + v, 0) / scoringVals.length
        : null,
    whistle:
      whistleVals.length > 0
        ? whistleVals.reduce((s, v) => s + v, 0) / whistleVals.length
        : null,
  };
}

export function computeCrewDominance(
  stats: RefStatsFile,
  minGames = CREW_DOMINANCE_MIN_GAMES,
): CrewDominanceEntry[] {
  const allSplits = flattenTeamSplits(stats.teamSplits);
  const crews = aggregateCrews(stats.teamSplits);
  const entries: CrewDominanceEntry[] = [];

  for (const acc of crews.values()) {
    if (acc.games < minGames) continue;

    const avgTotalPoints = round1(acc.totalPointsSum / acc.games);
    const avgFouls = round1(acc.foulsSum / acc.games);
    const overRate = round3(acc.overs / acc.games);
    const memberSlugs = acc.crewKey.split("|");
    const other = memberOtherCrewBaselines(allSplits, acc.crewKey, memberSlugs);

    entries.push({
      crewKey: acc.crewKey,
      crewNames: acc.crewNames,
      memberSlugs,
      games: acc.games,
      avgTotalPoints,
      scoringDelta: round1(avgTotalPoints - stats.meta.leagueAvgTotal),
      avgFouls,
      whistleDelta: round1(avgFouls - stats.meta.leagueAvgFouls),
      overRate,
      dominanceScoringDelta:
        other.scoring !== null
          ? round1(avgTotalPoints - other.scoring)
          : null,
      dominanceWhistleDelta:
        other.whistle !== null ? round1(avgFouls - other.whistle) : null,
      teamCount: acc.teamAbbrs.size,
    });
  }

  return entries;
}

export function sortCrewDominance(
  entries: CrewDominanceEntry[],
  sort: CrewDominanceSort,
): CrewDominanceEntry[] {
  const [key, direction] = sort.split("-") as [
    "games" | "scoring" | "whistle" | "dominance",
    "desc" | "asc" | string,
  ];
  const mult = direction === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    switch (key) {
      case "games":
        return mult * (a.games - b.games);
      case "scoring":
        return mult * (a.scoringDelta - b.scoringDelta);
      case "whistle":
        return mult * (a.whistleDelta - b.whistleDelta);
      case "dominance": {
        const field =
          sort === "dominance-whistle-desc"
            ? "dominanceWhistleDelta"
            : "dominanceScoringDelta";
        const aVal = a[field] ?? -Infinity;
        const bVal = b[field] ?? -Infinity;
        return mult * (aVal - bVal);
      }
      default:
        return 0;
    }
  });
}

export function crewDominanceSummary(
  entries: CrewDominanceEntry[],
  league: LeagueId,
): string {
  const officialWord = league === "nhl" ? "official" : "referee";
  return `${entries.length} recurring ${officialWord} crews with ${CREW_DOMINANCE_MIN_GAMES}+ combined games in this dataset`;
}
