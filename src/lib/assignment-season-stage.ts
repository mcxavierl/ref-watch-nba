import type { LeagueId } from "@/lib/leagues";
import type { AssignmentGame } from "@/lib/types";

export type AssignmentSeasonStage = "preseason" | "exhibition";

/** Plain-language slate note for non-regular-season games. */
export function formatSeasonStageNote(stage: AssignmentSeasonStage): string {
  if (stage === "preseason") return "Pre-season game";
  return "Exhibition match";
}

function nflPreseasonByDate(slateDate: string | undefined): boolean {
  if (!slateDate) return false;
  const month = Number.parseInt(slateDate.slice(5, 7), 10);
  return month === 8;
}

function nbaPreseasonByDate(slateDate: string | undefined): boolean {
  if (!slateDate) return false;
  const month = Number.parseInt(slateDate.slice(5, 7), 10);
  return month === 10;
}

function nhlPreseasonByDate(slateDate: string | undefined): boolean {
  if (!slateDate) return false;
  const month = Number.parseInt(slateDate.slice(5, 7), 10);
  return month === 9;
}

/** Resolve season stage from assignment metadata or conservative calendar heuristics. */
export function resolveAssignmentSeasonStage(
  leagueId: LeagueId,
  game: Pick<AssignmentGame, "seasonStage">,
  slateDate?: string,
): AssignmentSeasonStage | undefined {
  if (game.seasonStage) return game.seasonStage;

  if (leagueId === "nfl" && nflPreseasonByDate(slateDate)) return "preseason";
  if (leagueId === "nba" && nbaPreseasonByDate(slateDate)) return "preseason";
  if (leagueId === "nhl" && nhlPreseasonByDate(slateDate)) return "preseason";

  return undefined;
}

export function buildSeasonStageNote(
  leagueId: LeagueId,
  game: Pick<AssignmentGame, "seasonStage">,
  slateDate?: string,
): string | undefined {
  const stage = resolveAssignmentSeasonStage(leagueId, game, slateDate);
  return stage ? formatSeasonStageNote(stage) : undefined;
}

/** Map ESPN season.type slug to assignment season stage (NFL and soccer). */
export function seasonStageFromEspnSeason(season?: {
  type?: number;
  slug?: string;
}): AssignmentSeasonStage | undefined {
  if (!season) return undefined;
  const slug = (season.slug ?? "").toLowerCase();
  if (slug.includes("preseason") || slug.includes("pre-season")) return "preseason";
  if (slug.includes("friendly") || slug.includes("exhibition")) return "exhibition";
  if (season.type === 1) return "preseason";
  return undefined;
}
