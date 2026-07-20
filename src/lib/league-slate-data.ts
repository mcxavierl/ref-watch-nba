import type { NightlyFeed } from "@/lib/syndication";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";
import type { LeagueManifestId } from "@/lib/league-manifest";
import type { Finding } from "@/lib/findings-shared";

import {
  getAssignments as getNbaAssignments,
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import { getOdds as getNbaOdds } from "@/lib/odds";
import { computeFindings as computeNbaFindings } from "@/lib/findings";
import {
  buildNbaNightlyFeed,
  buildNflNightlyFeed,
  buildNhlNightlyFeed,
  buildEplNightlyFeed,
  buildLaligaNightlyFeed,
  buildCbbNightlyFeed,
  buildCfbNightlyFeed,
  buildWnbaNightlyFeed,
} from "@/lib/syndication";

import {
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { getOdds as getNhlOdds } from "@/lib/nhl/odds";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";

import {
  getAssignments as getNflAssignments,
  getRefStats as getNflRefStats,
} from "@/lib/nfl/data";
import { getOdds as getNflOdds } from "@/lib/nfl/odds";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { buildNflAnalyticsLeaders } from "@/lib/nfl/analytics-leaders";

import {
  getAssignments as getEplAssignments,
  getRefStats as getEplRefStats,
} from "@/lib/epl/data";
import { getOdds as getEplOdds } from "@/lib/epl/odds";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { buildEplAnalyticsLeaders } from "@/lib/epl/analytics-leaders";

import {
  getAssignments as getLaligaAssignments,
  getRefStats as getLaligaRefStats,
} from "@/lib/laliga/data";
import { getOdds as getLaligaOdds } from "@/lib/laliga/odds";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";

import {
  getAssignments as getCbbAssignments,
  getRefStats as getCbbRefStats,
} from "@/lib/cbb/data";
import { getOdds as getCbbOdds } from "@/lib/cbb/odds";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";

import {
  getAssignments as getCfbAssignments,
  getRefStats as getCfbRefStats,
} from "@/lib/cfb/data";
import { getOdds as getCfbOdds } from "@/lib/cfb/odds";
import { computeFindings as computeCfbFindings } from "@/lib/cfb/findings";
import { buildCfbAnalyticsLeaders } from "@/lib/cfb/analytics-leaders";
import { buildCbbAnalyticsLeaders } from "@/lib/cbb/analytics-leaders";
import {
  getAssignments as getWnbaAssignments,
  getRefStats as getWnbaRefStats,
} from "@/lib/wnba/data";
import { getOdds as getWnbaOdds } from "@/lib/wnba/odds";
import { computeFindings as computeWnbaFindings } from "@/lib/wnba/findings";

import { isOffseasonSlate, isPendingCrewSlate } from "@/lib/offseason";

type SlateLeagueId = Extract<
  LeagueManifestId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba"
>;

export type LeagueSlateBundle = {
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  odds: ReturnType<typeof getNbaOdds>;
  nightlyFeed: NightlyFeed;
  findings: (limit: number, scopedSeasons?: string[]) => Finding[];
  isOffseason: boolean;
  isPending: boolean;
  nflAnalyticsLeaders?: ReturnType<typeof buildNflAnalyticsLeaders>;
  eplAnalyticsLeaders?: ReturnType<typeof buildEplAnalyticsLeaders>;
  cfbAnalyticsLeaders?: ReturnType<typeof buildCfbAnalyticsLeaders>;
  cbbAnalyticsLeaders?: ReturnType<typeof buildCbbAnalyticsLeaders>;
};

const SLATE_LEAGUES = new Set<SlateLeagueId>([
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
  "wnba",
]);

export function isSlateLeagueId(id: LeagueManifestId): id is SlateLeagueId {
  return SLATE_LEAGUES.has(id as SlateLeagueId);
}

export function loadLeagueSlateBundle(leagueId: SlateLeagueId): LeagueSlateBundle {
  switch (leagueId) {
    case "nba": {
      const assignments = getNbaAssignments();
      const refStats = getNbaRefStats();
      return {
        assignments,
        refStats,
        odds: getNbaOdds(),
        nightlyFeed: buildNbaNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeNbaFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: assignments.games.length === 0,
        isPending: false,
      };
    }
    case "nhl": {
      const assignments = getNhlAssignments();
      const refStats = getNhlRefStats();
      return {
        assignments,
        refStats,
        odds: getNhlOdds(),
        nightlyFeed: buildNhlNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeNhlFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: isOffseasonSlate(assignments),
        isPending: isPendingCrewSlate(assignments),
      };
    }
    case "nfl": {
      const assignments = getNflAssignments();
      const refStats = getNflRefStats();
      return {
        assignments,
        refStats,
        odds: getNflOdds(),
        nightlyFeed: buildNflNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeNflFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: isOffseasonSlate(assignments),
        isPending: isPendingCrewSlate(assignments),
        nflAnalyticsLeaders: buildNflAnalyticsLeaders(refStats),
      };
    }
    case "epl": {
      const assignments = getEplAssignments();
      const refStats = getEplRefStats();
      return {
        assignments,
        refStats,
        odds: getEplOdds(),
        nightlyFeed: buildEplNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeEplFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: isOffseasonSlate(assignments),
        isPending: isPendingCrewSlate(assignments),
        eplAnalyticsLeaders: buildEplAnalyticsLeaders(refStats),
      };
    }
    case "laliga": {
      const assignments = getLaligaAssignments();
      const refStats = getLaligaRefStats();
      return {
        assignments,
        refStats,
        odds: getLaligaOdds(),
        nightlyFeed: buildLaligaNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeLaligaFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: isOffseasonSlate(assignments),
        isPending: isPendingCrewSlate(assignments),
        eplAnalyticsLeaders: buildEplAnalyticsLeaders(refStats),
      };
    }
    case "cbb": {
      const assignments = getCbbAssignments();
      const refStats = getCbbRefStats();
      return {
        assignments,
        refStats,
        odds: getCbbOdds(),
        nightlyFeed: buildCbbNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeCbbFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: assignments.games.length === 0,
        isPending: false,
        cbbAnalyticsLeaders: buildCbbAnalyticsLeaders(refStats),
      };
    }
    case "cfb": {
      const assignments = getCfbAssignments();
      const refStats = getCfbRefStats();
      return {
        assignments,
        refStats,
        odds: getCfbOdds(),
        nightlyFeed: buildCfbNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeCfbFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: isOffseasonSlate(assignments),
        isPending: isPendingCrewSlate(assignments),
        cfbAnalyticsLeaders: buildCfbAnalyticsLeaders(refStats),
      };
    }
    case "wnba": {
      const assignments = getWnbaAssignments();
      const refStats = getWnbaRefStats();
      return {
        assignments,
        refStats,
        odds: getWnbaOdds(),
        nightlyFeed: buildWnbaNightlyFeed(),
        findings: (limit, scopedSeasons) =>
          computeWnbaFindings(limit, scopedSeasons, { hub: true }),
        isOffseason: assignments.games.length === 0,
        isPending: false,
      };
    }
  }
}
