import type { RefStatsFile } from "@/lib/types";
import { isCbbSimulatedData } from "@/lib/cbb/data-source";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";
import { isEplSimulatedData } from "@/lib/epl/data-source";
import {
  isNflHybridData,
  isNflSimulatedData,
  isNflVerifiedData,
} from "@/lib/nfl/data-source";
import {
  resolveLeagueVerification,
  unverifiedBannerMessage,
} from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";

export type DataSourceBannerLeague =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "cbb"
  | "cfb";

export function leagueDataSourceBannerMessage(
  league: DataSourceBannerLeague,
  meta: RefStatsFile["meta"],
): string | null {
  const verification = resolveLeagueVerification(league as LeagueId, meta);

  if (!verification.data_verified) {
    const msg = unverifiedBannerMessage(league as LeagueId, meta);
    return msg || "Synthetic data — not from official sources";
  }

  const source = meta.data_source ?? meta.source;
  if (league === "nba") {
    return `Verified dataset. source: ${source}, verified`;
  }

  if (league === "nhl" && source === "seeded") {
    return "Historical seeded dataset. Run build-nhl-data for live NHL API backfill. Penalty and scoring splits may use synthetic lines until refreshed.";
  }

  if (league === "nfl") {
    if (isNflSimulatedData(meta.source)) {
      return "Preview dataset with simulated schedules, crews, and lines. Do not treat ref×team or betting stats as verified.";
    }
    if (isNflHybridData(meta.source) || isNflVerifiedData(meta.source)) {
      if (meta.atsAvailable) {
        return "Scores and ref×team W-L from ESPN game logs. ATS/O-U splits use nflverse historical closing lines where matched, not verified sportsbook data for every game. Exploratory context only.";
      }
      return "Scores and ref×team W-L from ESPN game logs. ATS/O-U splits are unavailable or incomplete for this sample.";
    }
  }

  if (league === "epl" && isEplSimulatedData(meta.source)) {
    return "Historical seeded or partial ESPN sample. Treat foul and goal splits as exploratory until the full match log is verified.";
  }

  if (league === "cbb" && isCbbSimulatedData(meta.source)) {
    return "Preview dataset only. No verified college basketball officiating sample is loaded.";
  }

  if (league === "cfb" && isCfbSimulatedData(meta.source)) {
    return "Preview dataset only. No verified college football officiating sample is loaded.";
  }

  if (meta.source === "seeded" || meta.source === "historical") {
    return "Historical seeded dataset. See Methodology for how lines and splits are derived.";
  }

  return `source: ${source}, verified`;
}
