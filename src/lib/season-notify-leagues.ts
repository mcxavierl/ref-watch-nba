export const SEASON_NOTIFY_LEAGUES = [
  "NBA",
  "NHL",
  "WNBA",
  "NFL",
  "EPL",
  "LALIGA",
  "CBB",
  "CFB",
] as const;

export type SeasonNotifyLeague = (typeof SEASON_NOTIFY_LEAGUES)[number];

export function isSeasonNotifyLeague(value: unknown): value is SeasonNotifyLeague {
  return (
    typeof value === "string" &&
    (SEASON_NOTIFY_LEAGUES as readonly string[]).includes(value)
  );
}
