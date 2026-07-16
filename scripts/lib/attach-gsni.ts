/**
 * Attach Game-State Neutralization Index fields to ref profiles during rebuilds.
 */
import {
  attachGsniToProfiles,
  buildGsniCorpusFromGameLogs,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
  type GsniComputeOptions,
  type GsniGameLogLike,
} from "../../src/lib/gsni";
import type { RefOfficial, RefProfile } from "../../src/lib/types";
import type { GameLogEntry } from "./game-logs";
import { refSlug } from "./slug";

function officialToRefereeId(official: RefOfficial): string {
  return refSlug(official.name, official.number);
}

export function attachGsniFieldsFromGames(
  profiles: RefProfile[],
  games: GsniGameLogLike[],
  refereeIdForOfficial: (official: RefOfficial) => string = officialToRefereeId,
  options: GsniComputeOptions = {},
): RefProfile[] {
  const corpus = buildGsniCorpusFromGameLogs(games, refereeIdForOfficial);
  return attachGsniToProfiles(profiles, corpus, options);
}

export function attachNflGsniFieldsFromGames(
  profiles: RefProfile[],
  games: GsniGameLogLike[],
  refereeIdForOfficial: (official: RefOfficial) => string = officialToRefereeId,
): RefProfile[] {
  return attachGsniFieldsFromGames(profiles, games, refereeIdForOfficial, {
    minHighLeverageMinutes: GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
  });
}

export function attachGsniFieldsFromGameLogs(
  profiles: RefProfile[],
  games: GameLogEntry[],
): RefProfile[] {
  return attachGsniFieldsFromGames(profiles, games);
}
