import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { readCbbTrendsConferenceParam } from "@/lib/cbb/conference-trends-shared";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string; conference?: string }>;
};

export default async function CbbInsightsPage({ searchParams }: PageProps) {
  const { scope, conference } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cbb"
      scopeMode={readSeasonScopeParam(scope)}
      cbbTrendsConference={readCbbTrendsConferenceParam(conference)}
    />
  );
}
