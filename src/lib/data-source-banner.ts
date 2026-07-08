import type { RefStatsFile } from "@/lib/types";
import { isCbbSimulatedData } from "@/lib/cbb/data-source";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";
import { isEplSimulatedData } from "@/lib/epl/data-source";
import {
  isNflHybridData,
  isNflSimulatedData,
  isNflVerifiedData,
} from "@/lib/nfl/data-source";

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
  const source = meta.source;

  if (league === "nba" && source === "seeded") {
    return "Historical seeded dataset. Crew logs and whistle splits are generated from comprehensive seed data; some betting lines are synthetic. Not live NBA Stats API feeds.";
  }

  if (league === "nhl" && source === "seeded") {
    return "Historical seeded dataset. Run build-nhl-data for live NHL API backfill. Penalty and scoring splits may use synthetic lines until refreshed.";
  }

  if (league === "nfl") {
    if (isNflSimulatedData(source)) {
      return "Preview dataset with simulated schedules, crews, and lines. Do not treat ref×team or betting stats as verified.";
    }
    if (isNflHybridData(source) || isNflVerifiedData(source)) {
      if (meta.atsAvailable) {
        return "Scores and ref×team W-L from ESPN game logs. ATS/O-U splits use nflverse historical closing lines where matched, not verified sportsbook data for every game. Exploratory context only.";
      }
      return "Scores and ref×team W-L from ESPN game logs. ATS/O-U splits are unavailable or incomplete for this sample.";
    }
  }

  if (league === "epl" && isEplSimulatedData(source)) {
    return "Historical seeded or partial ESPN sample. Treat foul and goal splits as exploratory until the full match log is verified.";
  }

  if (league === "cbb" && isCbbSimulatedData(source)) {
    return "Preview dataset only. No verified college basketball officiating sample is loaded.";
  }

  if (league === "cfb" && isCfbSimulatedData(source)) {
    return "Preview dataset only. No verified college football officiating sample is loaded.";
  }

  if (source === "seeded" || source === "historical") {
    return "Historical seeded dataset. See Methodology for how lines and splits are derived.";
  }

  return null;
}
