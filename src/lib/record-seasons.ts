import type { DataLeague } from "@/lib/game-logs-preload";
import {
  dataLeagueTenSeasons,
  DEFAULT_SINCE_SEASON,
} from "@/lib/league-seasons";

/** Season labels used for team W-L baselines (matrix, crew pages, findings). */
export function resolveRecordSeasonsForDisplay(
  dataLeague: DataLeague,
  metaSeasons: string[],
  sinceSeason: string = DEFAULT_SINCE_SEASON,
): string[] {
  const tenSeasons = [...dataLeagueTenSeasons(dataLeague)];
  const sortedMeta = [...metaSeasons].sort();

  let seasons =
    sortedMeta.length === 0
      ? tenSeasons
      : sortedMeta.filter((season) => season >= sinceSeason);

  if (seasons.length === 0) {
    seasons = sortedMeta.length > 0 ? sortedMeta : tenSeasons;
  }

  if (seasons.length > tenSeasons.length) {
    const tenSet = new Set(tenSeasons);
    const capped = seasons.filter((season) => tenSet.has(season));
    if (capped.length > 0) seasons = capped;
  }

  return seasons;
}
