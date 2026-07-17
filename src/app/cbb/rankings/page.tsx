import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { readCbbTrendsConferenceParam } from "@/lib/cbb/conference-trends-shared";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string; conference?: string }>;
};

export default async function CbbRankingsPage({ searchParams }: PageProps) {
  const { scope, conference } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cbb"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
      cbbTrendsConference={readCbbTrendsConferenceParam(conference)}
    />
  );
}
