import {
  buildGsniResearchRows,
  gsniResearchConfigForLeague,
} from "@/lib/gsni-research";
import type { InsightsLeagueId } from "@/lib/league-manifest";
import type { RefStatsFile } from "@/lib/types";
import { GameStateIndexDashboard } from "@/components/GameStateIndexDashboard";

export function GameStateIndexResearchSection({
  stats,
  leagueId = "nfl",
  basePath,
  compactHub = false,
}: {
  stats: RefStatsFile;
  leagueId?: InsightsLeagueId;
  basePath?: string;
  /** Hide duplicate hero highlights when GSNI cards already sit in the insights hub hero. */
  compactHub?: boolean;
}) {
  const config = gsniResearchConfigForLeague(leagueId);
  if (!config) return null;
  const resolvedConfig = basePath ? { ...config, basePath } : config;
  const rows = buildGsniResearchRows(stats, resolvedConfig, {
    highVarianceOnly: false,
  });
  if (rows.length === 0) return null;

  return (
    <GameStateIndexDashboard
      rows={rows}
      leagueId={leagueId}
      compactHub={compactHub}
    />
  );
}
