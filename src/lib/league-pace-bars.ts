import type { LeagueId } from "@/lib/leagues";

export type LeaguePaceMetricTrack = "whistle" | "score";

const DEFAULT_PACE_SCORE_MAX = 100;
const DEFAULT_PACE_WHISTLE_MAX = 20;

/** Historical density ceilings for score/scoring-pace tracks. */
const PACE_SCORE_MAX: Partial<Record<LeagueId, number>> = {
  nba: 250,
  nhl: 10,
  nfl: 60,
  epl: 5,
  laliga: 5,
  cbb: 180,
  cfb: 70,
};

/** Historical density ceilings for whistle/discipline tracks. */
const PACE_WHISTLE_MAX: Partial<Record<LeagueId, number>> = {
  nba: 50,
  nhl: 12,
  nfl: 18,
  epl: 6,
  laliga: 6,
  cbb: 45,
  cfb: 16,
};

export function formatLeaguePaceValue(value: number): string {
  return value.toFixed(1);
}

export function isLeaguePaceMetricZero(value: number): boolean {
  return value === 0 || formatLeaguePaceValue(value) === "0.0";
}

export function paceBarMaxForLeague(
  leagueId: LeagueId,
  track: LeaguePaceMetricTrack,
): number {
  const map = track === "score" ? PACE_SCORE_MAX : PACE_WHISTLE_MAX;
  return map[leagueId] ?? (track === "score" ? DEFAULT_PACE_SCORE_MAX : DEFAULT_PACE_WHISTLE_MAX);
}

/** Normalized fill width (0–100) from raw metric ÷ league-specific ceiling. */
export function paceBarWidthPercent(
  leagueId: LeagueId,
  track: LeaguePaceMetricTrack,
  rawValue: number,
): number {
  if (isLeaguePaceMetricZero(rawValue)) return 0;
  const max = paceBarMaxForLeague(leagueId, track);
  if (max <= 0) return 0;
  return Math.min(100, Math.round((rawValue / max) * 100));
}

/** Stable hub pace row: NBA, CBB, NFL, NHL, La Liga, EPL. */
export const LEAGUE_PACE_DISPLAY_ORDER: LeagueId[] = [
  "nba",
  "cbb",
  "nfl",
  "nhl",
  "laliga",
  "epl",
];

export function sortLeaguePaceCards<T extends { leagueId: LeagueId }>(cards: T[]): T[] {
  const order = new Map(LEAGUE_PACE_DISPLAY_ORDER.map((id, index) => [id, index]));
  return [...cards].sort(
    (a, b) => (order.get(a.leagueId) ?? 99) - (order.get(b.leagueId) ?? 99),
  );
}
