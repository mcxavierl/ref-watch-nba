import {
  computeCrewMetrics as computeNbaCrewMetrics,
  refSlug as nbaRefSlug,
} from "@/lib/data";
import { detectTeamsInGame as detectNbaTeams } from "@/lib/teams";
import { computeCrewHomeBias as computeNbaHomeBias } from "@/lib/home-bias";
import { computeCrewWhistlePremium as computeNbaPremium } from "@/lib/whistle-premium";
import { computeGameStorylines as computeNbaStorylines } from "@/lib/grudge-match";

import {
  computeCrewMetrics as computeNhlCrewMetrics,
  refSlug as nhlRefSlug,
} from "@/lib/nhl/data";
import { detectTeamsInGame as detectNhlTeams } from "@/lib/nhl/teams";
import { computeCrewHomeBias as computeNhlHomeBias } from "@/lib/nhl/home-bias";
import { computeCrewWhistlePremium as computeNhlPremium } from "@/lib/nhl/whistle-premium";

import {
  computeCrewMetrics as computeNflCrewMetrics,
  refSlug as nflRefSlug,
} from "@/lib/nfl/data";
import { detectTeamsInGame as detectNflTeams } from "@/lib/nfl/teams";
import { computeCrewHomeBias as computeNflHomeBias } from "@/lib/nfl/home-bias";
import { computeCrewWhistlePremium as computeNflPremium } from "@/lib/nfl/whistle-premium";

import {
  computeCrewMetrics as computeEplCrewMetrics,
  refSlug as eplRefSlug,
} from "@/lib/epl/data";
import { detectTeamsInGame as detectEplTeams } from "@/lib/epl/teams";
import { computeCrewHomeBias as computeEplHomeBias } from "@/lib/epl/home-bias";
import { computeCrewWhistlePremium as computeEplPremium } from "@/lib/epl/whistle-premium";

import {
  computeCrewMetrics as computeLaligaCrewMetrics,
  refSlug as laligaRefSlug,
} from "@/lib/laliga/data";
import { detectTeamsInGame as detectLaligaTeams } from "@/lib/laliga/teams";
import { computeCrewHomeBias as computeLaligaHomeBias } from "@/lib/laliga/home-bias";
import { computeCrewWhistlePremium as computeLaligaPremium } from "@/lib/laliga/whistle-premium";

import {
  computeCrewMetrics as computeCbbCrewMetrics,
  refSlug as cbbRefSlug,
} from "@/lib/cbb/data";
import { detectTeamsInGame as detectCbbTeams } from "@/lib/cbb/teams";
import { computeCrewHomeBias as computeCbbHomeBias } from "@/lib/cbb/home-bias";
import { computeCrewWhistlePremium as computeCbbPremium } from "@/lib/cbb/whistle-premium";

import {
  computeCrewMetrics as computeCfbCrewMetrics,
  refSlug as cfbRefSlug,
} from "@/lib/cfb/data";
import { detectTeamsInGame as detectCfbTeams } from "@/lib/cfb/teams";
import { computeCrewHomeBias as computeCfbHomeBias } from "@/lib/cfb/home-bias";
import { computeCrewWhistlePremium as computeCfbPremium } from "@/lib/cfb/whistle-premium";

import {
  computeCrewMetrics as computeWnbaCrewMetrics,
  refSlug as wnbaRefSlug,
} from "@/lib/wnba/data";
import { detectTeamsInGame as detectWnbaTeams } from "@/lib/wnba/teams";
import type { LeagueId } from "@/lib/leagues";
import type { CrewMetrics } from "@/lib/data";
import type {
  AssignmentGame,
  CrewHomeBias,
  CrewWhistlePremium,
  OddsFile,
  RefOfficial,
  RefRole,
  RefStatsFile,
} from "@/lib/types";
import type { GrudgeStoryline } from "@/lib/grudge-match";

export type SlatePreviewLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba"
>;

type TeamLike = { abbr: string; name: string };

export type SlatePreviewAdapter = {
  refSlug: (name: string, number: number) => string;
  detectTeams: (away: string, home: string) => TeamLike[];
  computeCrewMetrics: (crew: RefOfficial[], stats: RefStatsFile) => CrewMetrics;
  computePremium?: (
    game: AssignmentGame,
    stats: RefStatsFile,
    odds: OddsFile,
  ) => CrewWhistlePremium;
  computeHomeBias?: (game: AssignmentGame, stats: RefStatsFile) => CrewHomeBias | null;
  computeStorylines?: (
    game: AssignmentGame,
    stats: RefStatsFile,
    limit: number,
  ) => GrudgeStoryline[];
};

export const SLATE_PREVIEW_ADAPTERS: Record<SlatePreviewLeagueId, SlatePreviewAdapter> = {
  nba: {
    refSlug: nbaRefSlug,
    detectTeams: detectNbaTeams,
    computeCrewMetrics: computeNbaCrewMetrics,
    computePremium: computeNbaPremium,
    computeHomeBias: computeNbaHomeBias,
    computeStorylines: computeNbaStorylines,
  },
  nhl: {
    refSlug: nhlRefSlug,
    detectTeams: detectNhlTeams,
    computeCrewMetrics: computeNhlCrewMetrics,
    computePremium: computeNhlPremium,
    computeHomeBias: computeNhlHomeBias,
  },
  nfl: {
    refSlug: nflRefSlug,
    detectTeams: detectNflTeams,
    computeCrewMetrics: computeNflCrewMetrics,
    computePremium: computeNflPremium,
    computeHomeBias: computeNflHomeBias,
  },
  epl: {
    refSlug: eplRefSlug,
    detectTeams: detectEplTeams,
    computeCrewMetrics: computeEplCrewMetrics,
    computePremium: computeEplPremium,
    computeHomeBias: computeEplHomeBias,
  },
  laliga: {
    refSlug: laligaRefSlug,
    detectTeams: detectLaligaTeams,
    computeCrewMetrics: computeLaligaCrewMetrics,
    computePremium: computeLaligaPremium,
    computeHomeBias: computeLaligaHomeBias,
  },
  cbb: {
    refSlug: cbbRefSlug,
    detectTeams: detectCbbTeams,
    computeCrewMetrics: computeCbbCrewMetrics,
    computePremium: computeCbbPremium,
    computeHomeBias: computeCbbHomeBias,
  },
  cfb: {
    refSlug: cfbRefSlug,
    detectTeams: detectCfbTeams,
    computeCrewMetrics: computeCfbCrewMetrics,
    computePremium: computeCfbPremium,
    computeHomeBias: computeCfbHomeBias,
  },
  wnba: {
    refSlug: wnbaRefSlug,
    detectTeams: detectWnbaTeams,
    computeCrewMetrics: computeWnbaCrewMetrics,
  },
};

export function isSlatePreviewLeague(leagueId: LeagueId): leagueId is SlatePreviewLeagueId {
  return leagueId in SLATE_PREVIEW_ADAPTERS;
}
