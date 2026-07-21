import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  gsniResearchConfigForLeague,
} from "@/lib/gsni-research";
import type { InsightsLeagueId } from "@/lib/league-manifest";
import type { RefStatsFile } from "@/lib/types";
import { GameStateIndexDashboard } from "@/components/GameStateIndexDashboard";
import { GsniResearchIntro } from "@/components/GsniResearchIntro";

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
  const highlights = buildGsniResearchHighlights(stats, resolvedConfig, {
    highVarianceOnly: false,
  });
  const rows = buildGsniResearchRows(stats, resolvedConfig, {
    highVarianceOnly: false,
  });

  if (rows.length === 0) {
    return (
      <>
        <GsniResearchIntro
          leagueId={leagueId}
          ratedCount={0}
          trackedCount={stats.refs.length}
        />
        <p className="gsni-sub-text section-lead">
          No officials meet the high-leverage sample gate yet. Game-State Index
          metrics refresh when officiating logs are rebuilt.
        </p>
      </>
    );
  }

  return (
    <GameStateIndexDashboard
      highlights={highlights}
      rows={rows}
      leagueId={leagueId}
      compactHub={compactHub}
    />
  );
}
