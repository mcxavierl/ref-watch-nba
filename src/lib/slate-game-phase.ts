import type { LeagueId } from "@/lib/leagues";

/** ESPN `status.type.name` values we care about on assignment slates. */
export type EspnGameStatusName =
  | "STATUS_SCHEDULED"
  | "STATUS_IN_PROGRESS"
  | "STATUS_HALFTIME"
  | "STATUS_END_PERIOD"
  | "STATUS_FINAL"
  | string;

export type SlateGamePhase = "pregame" | "live" | "final";

export type SlateLiveScore = {
  leagueId: LeagueId;
  gameId: string;
  awayScore: number;
  homeScore: number;
  gameStatus: EspnGameStatusName;
  gamePhase: SlateGamePhase;
  gameClock?: string;
  gamePeriod?: string;
};

const LIVE_ESPN_STATUSES = new Set([
  "STATUS_IN_PROGRESS",
  "STATUS_HALFTIME",
  "STATUS_END_PERIOD",
]);

export function isEspnGameLive(status: string | undefined): boolean {
  return Boolean(status && LIVE_ESPN_STATUSES.has(status));
}

export function isEspnGameFinal(status: string | undefined): boolean {
  return status === "STATUS_FINAL";
}

export function resolveSlateGamePhase(
  gameStatus: string | undefined,
): SlateGamePhase {
  if (isEspnGameLive(gameStatus)) return "live";
  if (isEspnGameFinal(gameStatus)) return "final";
  return "pregame";
}

export function formatSlateGameClock(
  gameStatus: string | undefined,
  displayClock?: string,
  periodLabel?: string,
): string | undefined {
  if (isEspnGameFinal(gameStatus)) return "Final";
  if (gameStatus === "STATUS_HALFTIME") return "Halftime";
  if (displayClock && periodLabel) return `${periodLabel} ${displayClock}`;
  if (displayClock) return displayClock;
  if (periodLabel) return periodLabel;
  if (isEspnGameLive(gameStatus)) return "Live";
  return undefined;
}

export function hasSlateScore(
  phase: SlateGamePhase | undefined,
  awayScore?: number,
  homeScore?: number,
): boolean {
  if (phase === "live" || phase === "final") return true;
  return awayScore !== undefined && homeScore !== undefined;
}

/** ESPN scoreboard sport path segments keyed by Ref Watch league id. */
export const ESPN_SCOREBOARD_PATHS: Partial<Record<LeagueId, string>> = {
  nba: "basketball/nba",
  wnba: "basketball/wnba",
  nfl: "football/nfl",
  epl: "soccer/eng.1",
  laliga: "soccer/esp.1",
};

export function espnScoreboardUrl(leagueId: LeagueId, yyyymmdd: string): string | null {
  const path = ESPN_SCOREBOARD_PATHS[leagueId];
  if (!path) return null;
  return `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${yyyymmdd}`;
}

export function toYyyymmdd(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

export function torontoIsoDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
