import * as fs from "node:fs";
import * as path from "node:path";
import type { LeagueId } from "@/lib/leagues";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import { registerWorkerIsolateEndCallback } from "@/lib/worker-isolate-store";

/** Leagues with friction-matrix personnel sidecars (NBA, NFL, NHL). */
export const FRICTION_MATRIX_LEAGUE_IDS = ["nba", "nfl", "nhl"] as const;
export type FrictionMatrixLeagueId = (typeof FRICTION_MATRIX_LEAGUE_IDS)[number];

export interface CoachProfile {
  coachId: string;
  name: string;
  team: string;
  season: string;
  /** League-normalized bench/sideline whistle events per game (techs, flags, minors). */
  careerAvgWhistleEvents?: number;
  gamesSampled?: number;
}

export interface StarPlayerProfile {
  playerId: string;
  name: string;
  team: string;
  season: string;
  usageRank: number;
  /** 0–100; values ≥ 90 denote top-10% star tier. */
  starTierPercentile?: number;
  /** Seasonal average fouls drawn per game when known. */
  seasonAvgFoulsDrawn?: number;
  gamesSampled?: number;
}

export interface PersonnelProfileFile {
  lastUpdated: string;
  league: string;
  coaches: CoachProfile[];
  starPlayers: StarPlayerProfile[];
}

const cache = new Map<LeagueId, PersonnelProfileFile | null>();

const PERSONNEL_RELATIVE_PATHS: Partial<Record<FrictionMatrixLeagueId, string>> = {
  nba: path.join("data", "nba", "personnel-profiles.json"),
  nfl: path.join("data", "nfl", "personnel-profiles.json"),
  nhl: path.join("data", "nhl", "personnel-profiles.json"),
};

function personnelPath(leagueId: LeagueId): string | null {
  if (leagueId === "epl") {
    return path.join(process.cwd(), "data", "epl", "personnel-profiles.json");
  }
  if (leagueId === "laliga") {
    return path.join(process.cwd(), "data", "laliga", "personnel-profiles.json");
  }
  const relative = PERSONNEL_RELATIVE_PATHS[leagueId as FrictionMatrixLeagueId];
  return relative ? path.join(process.cwd(), relative) : null;
}

export function loadPersonnelProfiles(
  leagueId: LeagueId,
): PersonnelProfileFile | null {
  if (
    !(FRICTION_MATRIX_LEAGUE_IDS as readonly LeagueId[]).includes(
      leagueId as FrictionMatrixLeagueId,
    ) &&
    leagueId !== "epl" &&
    leagueId !== "laliga"
  ) {
    return null;
  }

  if (cache.has(leagueId)) return cache.get(leagueId) ?? null;
  if (!allowNodeDataFs()) {
    cache.set(leagueId, null);
    return null;
  }

  const filePath = personnelPath(leagueId);
  if (!filePath || !fs.existsSync(filePath)) {
    cache.set(leagueId, null);
    return null;
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as PersonnelProfileFile;
    cache.set(leagueId, parsed);
    return parsed;
  } catch {
    cache.set(leagueId, null);
    return null;
  }
}

export function coachForTeamSeason(
  profiles: PersonnelProfileFile | null,
  team: string,
  season: string,
): CoachProfile | null {
  if (!profiles) return null;
  const abbr = team.toUpperCase();
  return (
    profiles.coaches.find(
      (coach) => coach.team === abbr && coach.season === season,
    ) ?? null
  );
}

export function starPlayersForTeamSeason(
  profiles: PersonnelProfileFile | null,
  team: string,
  season: string,
): StarPlayerProfile[] {
  if (!profiles) return [];
  const abbr = team.toUpperCase();
  return profiles.starPlayers.filter(
    (player) => player.team === abbr && player.season === season,
  );
}

export function clearPersonnelProfilesCache(): void {
  cache.clear();
}

registerWorkerIsolateEndCallback(clearPersonnelProfilesCache);
