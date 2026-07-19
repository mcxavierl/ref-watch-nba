/**
 * NFL GSNI research — thin wrapper over shared `@/lib/gsni-research`.
 */
export type {
  GsniResearchHighlight,
  GsniResearchRow,
} from "@/lib/gsni-research";

export {
  GSNI_RESEARCH_HIGHLIGHT_LIMIT,
  GSNI_RESEARCH_MIN_SAMPLE_GAMES,
} from "@/lib/gsni-research";

import {
  buildGsniResearchHighlights as buildHighlightsShared,
  buildGsniResearchRows as buildRowsShared,
  gsniResearchConfigForLeague,
  type GsniResearchHighlight,
  type GsniResearchRow,
} from "@/lib/gsni-research";
import type { RefStatsFile } from "@/lib/types";

export function buildGsniResearchRows(
  stats: RefStatsFile,
  basePath = "/nfl",
): GsniResearchRow[] {
  const config = gsniResearchConfigForLeague("nfl");
  if (!config) return [];
  return buildRowsShared(stats, { ...config, basePath });
}

export function buildGsniResearchHighlights(
  stats: RefStatsFile,
  basePath = "/nfl",
  limit?: number,
): GsniResearchHighlight[] {
  const config = gsniResearchConfigForLeague("nfl");
  if (!config) return [];
  return buildHighlightsShared(stats, { ...config, basePath }, limit);
}
