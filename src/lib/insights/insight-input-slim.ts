import type { RefProfile, RefStatsFile, RefTeamStat } from "@/lib/types";

/** Team split fields retained for matrix + whistle outlier scans. */
export type SlimRefTeamStat = Pick<
  RefTeamStat,
  | "games"
  | "winRate"
  | "wins"
  | "losses"
  | "avgFoulDifferential"
  | "overRate"
  | "avgTotalPoints"
  | "atsWins"
  | "atsLosses"
  | "atsPushes"
  | "atsGames"
  | "atsCoverRate"
>;

/** Ref profile fields retained for insight generation (no game logs or betting). */
export type SlimRefProfile = Pick<
  RefProfile,
  "slug" | "name" | "number" | "games" | "avgFouls" | "foulsDelta" | "seasons"
> & {
  teamStats?: Record<string, SlimRefTeamStat>;
};

export type SlimLeagueStats = {
  meta: RefStatsFile["meta"];
  refs: SlimRefProfile[];
  teamAtsBaselines?: RefStatsFile["teamAtsBaselines"];
};

const SLIM_TEAM_STAT_KEYS: (keyof SlimRefTeamStat)[] = [
  "games",
  "winRate",
  "wins",
  "losses",
  "avgFoulDifferential",
  "overRate",
  "avgTotalPoints",
  "atsWins",
  "atsLosses",
  "atsPushes",
  "atsGames",
  "atsCoverRate",
];

export function stripTeamStatForInsights(stat: RefTeamStat): SlimRefTeamStat {
  const slim: Partial<SlimRefTeamStat> = {};
  for (const key of SLIM_TEAM_STAT_KEYS) {
    const value = stat[key];
    if (value !== undefined) {
      (slim as Record<string, unknown>)[key] = value;
    }
  }
  return slim as SlimRefTeamStat;
}

export function stripRefProfileForInsights(ref: RefProfile): SlimRefProfile {
  const slim: SlimRefProfile = {
    slug: ref.slug,
    name: ref.name,
    number: ref.number,
    games: ref.games,
    avgFouls: ref.avgFouls,
    foulsDelta: ref.foulsDelta,
    seasons: ref.seasons,
  };

  if (ref.teamStats && Object.keys(ref.teamStats).length > 0) {
    slim.teamStats = {};
    for (const [teamAbbr, stat] of Object.entries(ref.teamStats)) {
      slim.teamStats[teamAbbr] = stripTeamStatForInsights(stat);
    }
  }

  return slim;
}

/** Cast slim refs into RefStatsFile shape for matrix compute (no heavy fields). */
export function slimLeagueStatsToRefStatsFile(slim: SlimLeagueStats): RefStatsFile {
  return {
    meta: slim.meta,
    refs: slim.refs as RefProfile[],
    teamSplits: {},
    teamAtsBaselines: slim.teamAtsBaselines,
  };
}

/** Minimal RefProfile for whistle-pace card generation from slim data. */
export function slimRefToWhistleRef(ref: SlimRefProfile): RefProfile {
  return {
    slug: ref.slug,
    name: ref.name,
    number: ref.number,
    games: ref.games,
    avgFouls: ref.avgFouls,
    foulsDelta: ref.foulsDelta,
    seasons: ref.seasons,
    avgTotalPoints: 0,
    overRate: 0,
    homeCoverRate: null,
    totalPointsDelta: 0,
    recentGames: [],
  };
}
