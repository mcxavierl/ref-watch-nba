import * as fs from "node:fs";
import * as path from "node:path";
import {
  computeCrewMetrics as computeNbaCrewMetrics,
  crewKey as nbaCrewKey,
  refSlug,
} from "@/lib/data";
import { computeCrewMetrics as computeNflCrewMetrics, crewKey as nflCrewKey } from "@/lib/nfl/data";
import { computeCrewMetrics as computeNhlCrewMetrics, crewKey as nhlCrewKey } from "@/lib/nhl/data";
import { computeCrewMetrics as computeEplCrewMetrics, crewKey as eplCrewKey } from "@/lib/epl/data";
import { computeCrewMetrics as computeLaligaCrewMetrics, crewKey as laligaCrewKey } from "@/lib/laliga/data";
import { computeCrewMetrics as computeCbbCrewMetrics, crewKey as cbbCrewKey } from "@/lib/cbb/data";
import { computeCrewMetrics as computeWnbaCrewMetrics, crewKey as wnbaCrewKey } from "@/lib/wnba/data";
import { computeCrewWhistlePremium as computeNbaPremium } from "@/lib/whistle-premium";
import { computeCrewWhistlePremium as computeNflPremium } from "@/lib/nfl/whistle-premium";
import { computeCrewWhistlePremium as computeNhlPremium } from "@/lib/nhl/whistle-premium";
import { computeCrewWhistlePremium as computeEplPremium } from "@/lib/epl/whistle-premium";
import { computeCrewWhistlePremium as computeLaligaPremium } from "@/lib/laliga/whistle-premium";
import { computeCrewWhistlePremium as computeCbbPremium } from "@/lib/cbb/whistle-premium";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { LEAGUE_IDS, type LeagueId } from "@/lib/leagues";
import type { AssignmentsFile, CrewMetrics, RefOfficial, RefStatsFile } from "@/lib/types";

export type CrewChemistryMember = {
  slug: string;
  name: string;
  number: number;
  role?: string;
  avgFouls: number | null;
  foulsDelta: number | null;
};

export type CrewChemistryPayload = {
  leagueId: LeagueId;
  crewKey: string;
  memberCount: number;
  members: CrewChemistryMember[];
  reunionPremium: number | null;
  reunionGames: number;
  crewFoulsDelta: number | null;
  crewTotalPointsDelta: number | null;
  frictionDelta: number | null;
  sampleGames: number;
};

type CrewLeagueAdapter = {
  crewKey: (refs: { name: string; number: number }[]) => string;
  computeCrewMetrics: (crew: RefOfficial[], stats: RefStatsFile) => CrewMetrics;
  computePremium?: (
    game: AssignmentsFile["games"][number],
    stats: RefStatsFile,
  ) => { reunionPremium: number | null; reunionGames: number };
};

const ADAPTERS: Partial<Record<LeagueId, CrewLeagueAdapter>> = {
  nba: {
    crewKey: nbaCrewKey,
    computeCrewMetrics: computeNbaCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeNbaPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  nfl: {
    crewKey: nflCrewKey,
    computeCrewMetrics: computeNflCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeNflPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  nhl: {
    crewKey: nhlCrewKey,
    computeCrewMetrics: computeNhlCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeNhlPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  epl: {
    crewKey: eplCrewKey,
    computeCrewMetrics: computeEplCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeEplPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  laliga: {
    crewKey: laligaCrewKey,
    computeCrewMetrics: computeLaligaCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeLaligaPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  cbb: {
    crewKey: cbbCrewKey,
    computeCrewMetrics: computeCbbCrewMetrics,
    computePremium: (game, stats) => {
      const premium = computeCbbPremium(game, stats);
      return {
        reunionPremium: premium.reunionPremium,
        reunionGames: premium.reunionGames,
      };
    },
  },
  wnba: {
    crewKey: wnbaCrewKey,
    computeCrewMetrics: computeWnbaCrewMetrics,
  },
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

function loadAssignments(leagueId: LeagueId): AssignmentsFile | null {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
  } catch {
    return null;
  }
}

function findAssignmentByGameId(
  file: AssignmentsFile,
  gameId: string,
): AssignmentsFile["games"][number] | null {
  return (
    [...file.games, ...(file.scheduledGames ?? [])].find((game) => game.id === gameId) ??
    null
  );
}

function crewFromSlugs(
  statsRefs: RefStatsFile["refs"],
  slugs: string[],
): RefOfficial[] {
  const officials: RefOfficial[] = [];
  for (const slug of slugs) {
    const profile = statsRefs.find((ref) => ref.slug === slug);
    if (!profile) continue;
    officials.push({
      name: profile.name,
      number: profile.number,
      role: profile.role ?? "referee",
    });
  }
  return officials;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseCrewChemistryLeague(value: string | null): LeagueId | null {
  if (!value) return null;
  return LEAGUE_IDS.includes(value as LeagueId) ? (value as LeagueId) : null;
}

export function parseCrewSlugsParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function buildCrewChemistryPayload(input: {
  leagueId: LeagueId;
  crewSlugs?: string[];
  gameId?: string;
}): CrewChemistryPayload | null {
  const adapter = ADAPTERS[input.leagueId];
  if (!adapter) return null;

  const statsFile = loadLeagueStats(input.leagueId).stats;
  let crew: RefOfficial[] = [];
  let assignment: AssignmentsFile["games"][number] | null = null;

  if (input.gameId) {
    const assignments = loadAssignments(input.leagueId);
    assignment = assignments ? findAssignmentByGameId(assignments, input.gameId) : null;
    crew = assignment?.crew ?? [];
  } else if (input.crewSlugs && input.crewSlugs.length > 0) {
    crew = crewFromSlugs(statsFile.refs, input.crewSlugs);
  }

  if (crew.length === 0) return null;

  const key = adapter.crewKey(crew);
  const metrics = adapter.computeCrewMetrics(crew, statsFile);
  const members: CrewChemistryMember[] = crew.map((official) => {
    const slug = refSlug(official.name, official.number);
    const profile = statsFile.refs.find((ref) => ref.slug === slug);
    return {
      slug,
      name: official.name,
      number: official.number,
      role: official.role,
      avgFouls: profile?.avgFouls ?? null,
      foulsDelta: profile?.foulsDelta ?? null,
    };
  });

  const foulDeltas = members
    .map((member) => member.foulsDelta)
    .filter((value): value is number => value !== null);
  const frictionDelta =
    foulDeltas.length >= 2
      ? round1(Math.max(...foulDeltas) - Math.min(...foulDeltas))
      : null;

  let reunionPremium: number | null = null;
  let reunionGames = 0;
  if (assignment && adapter.computePremium) {
    const premium = adapter.computePremium(assignment, statsFile);
    reunionPremium = premium.reunionPremium;
    reunionGames = premium.reunionGames;
  }

  return {
    leagueId: input.leagueId,
    crewKey: key,
    memberCount: crew.length,
    members,
    reunionPremium,
    reunionGames,
    crewFoulsDelta: metrics.insufficientSample ? null : metrics.foulsDelta,
    crewTotalPointsDelta: metrics.insufficientSample ? null : metrics.totalPointsDelta,
    frictionDelta,
    sampleGames: metrics.sampleGames,
  };
}
