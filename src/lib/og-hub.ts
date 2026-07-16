import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { LEAGUE_HERO_STATS } from "@/lib/league-hero-stats.generated";
import { LIVE_NCAA_CONFERENCES } from "@/lib/ncaa-conference-gate";
import { formatSeasonScope } from "@/lib/season-scope";
import type { SlateHubLeagueId } from "@/lib/seo";

export type HubOgMetric = {
  label: string;
  value: string;
};

export type HubOgContent = {
  leagueLabel: string;
  title: string;
  lead: string;
  metrics: HubOgMetric[];
  tags: string[];
  footer: string;
  accent: string;
};

function formatStatCount(value: number | undefined): string {
  if (value == null || value === 0) return "-";
  return value.toLocaleString("en-US");
}

export function cbbHubOgContent(): HubOgContent {
  const copy = leagueHeroCopy("cbb");
  const refStats = getCbbRefStats();
  const snapshot = LEAGUE_HERO_STATS.cbb;
  const officialCount = refStats.refs?.length || snapshot?.officials || 0;
  const gamesProcessed = refStats.meta.totalGamesProcessed || snapshot?.games || 0;
  const seasonSpan =
    refStats.meta.seasons.length > 0
      ? formatSeasonScope(refStats.meta.seasons.length)
      : (snapshot?.seasonSpan ?? "-");

  return {
    leagueLabel: "CBB",
    title: copy.offseasonTitle,
    lead: copy.offseasonLead,
    metrics: [
      {
        label: copy.statLabels.officials,
        value: officialCount > 0 ? officialCount.toLocaleString("en-US") : "-",
      },
      {
        label: copy.statLabels.games,
        value: formatStatCount(gamesProcessed),
      },
      {
        label: copy.statLabels.seasons,
        value: seasonSpan,
      },
    ],
    tags: [...LIVE_NCAA_CONFERENCES],
    footer: "Historical referee analytics · Not betting advice · refwatch.ca",
    accent: "#009CDE",
  };
}

export function hubOgContentForLeague(leagueId: SlateHubLeagueId): HubOgContent | null {
  if (leagueId === "cbb") return cbbHubOgContent();
  return null;
}
