import { getRefStats as getNbaRefStats } from "@/lib/data";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";
import { getRefStats as getEplRefStats } from "@/lib/epl/data";
import { getRefStats as getLaligaRefStats } from "@/lib/laliga/data";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, leagueHref, type LeagueId } from "@/lib/leagues";
import { CBB_TEAMS, teamFullName as cbbTeamFullName } from "@/lib/cbb/teams";
import { CFB_TEAMS, teamFullName as cfbTeamFullName } from "@/lib/cfb/teams";
import { EPL_TEAMS, teamFullName as eplTeamFullName } from "@/lib/epl/teams";
import { LALIGA_TEAMS, teamFullName as laligaTeamFullName } from "@/lib/laliga/teams";
import { NFL_TEAMS, teamFullName as nflTeamFullName } from "@/lib/nfl/teams";
import { NHL_TEAMS, teamFullName as nhlTeamFullName } from "@/lib/nhl/teams";
import { NBA_TEAMS, teamFullName as nbaTeamFullName } from "@/lib/teams";
import { SlateQuickLookup, type SlateQuickLookupTeam } from "@/components/SlateQuickLookup";
import type { RefStatsFile } from "@/lib/types";

export type SpotlightLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
>;

type SpotlightConfig = {
  getRefStats: () => RefStatsFile;
  teams: { abbr: string; label: string }[];
};

const SPOTLIGHT_CONFIG: Record<SpotlightLeagueId, SpotlightConfig> = {
  nba: {
    getRefStats: getNbaRefStats,
    teams: NBA_TEAMS.map((team) => ({ abbr: team.abbr, label: nbaTeamFullName(team) })),
  },
  nhl: {
    getRefStats: getNhlRefStats,
    teams: NHL_TEAMS.map((team) => ({ abbr: team.abbr, label: nhlTeamFullName(team) })),
  },
  nfl: {
    getRefStats: getNflRefStats,
    teams: NFL_TEAMS.map((team) => ({ abbr: team.abbr, label: nflTeamFullName(team) })),
  },
  epl: {
    getRefStats: getEplRefStats,
    teams: EPL_TEAMS.map((team) => ({ abbr: team.abbr, label: eplTeamFullName(team) })),
  },
  laliga: {
    getRefStats: getLaligaRefStats,
    teams: LALIGA_TEAMS.map((team) => ({ abbr: team.abbr, label: laligaTeamFullName(team) })),
  },
  cbb: {
    getRefStats: getCbbRefStats,
    teams: CBB_TEAMS.map((team) => ({ abbr: team.abbr, label: cbbTeamFullName(team) })),
  },
  cfb: {
    getRefStats: getCfbRefStats,
    teams: CFB_TEAMS.map((team) => ({ abbr: team.abbr, label: cfbTeamFullName(team) })),
  },
};

const SAMPLE_REF_SLUGS: Record<SpotlightLeagueId, string[]> = {
  nba: ["scott-foster-48", "tony-brothers-25", "marc-davis-8"],
  nhl: [],
  nfl: [],
  epl: [],
  laliga: [],
  cbb: [],
  cfb: [],
};

/** Predictive Spotlight search wrapper — resolves the correct refs/teams/shortcuts for any league hub. */
export function LeagueSpotlightSearch({ leagueId }: { leagueId: SpotlightLeagueId }) {
  const config = SPOTLIGHT_CONFIG[leagueId];
  const prefix = LEAGUES[leagueId].pathPrefix;
  const refStats = config.getRefStats();

  const refs = refStats.refs.map((ref) => ({
    slug: ref.slug,
    name: ref.name,
    games: ref.games,
    href: `${prefix}/refs/${ref.slug}`,
  }));

  const teams: SlateQuickLookupTeam[] = config.teams.map((team) => ({
    abbr: team.abbr,
    label: team.label,
    detail: `${team.abbr} · ${LEAGUES[leagueId].shortLabel}`,
    href: `${prefix}/teams/${team.abbr}`,
  }));

  return (
    <SlateQuickLookup
      refs={refs}
      teams={teams}
      sampleRefSlugs={SAMPLE_REF_SLUGS[leagueId]}
      matrixHref={leagueHref(leagueId, "/matrix")}
      insightsHref={insightsViewHref(leagueId, "trends")}
    />
  );
}
