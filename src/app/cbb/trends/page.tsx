import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import {
  buildCbbConferenceTrendRows,
  cbbTrendsConferenceLabel,
  type CbbTrendsConferenceScope,
} from "@/lib/cbb/conference-trends";
import { readCbbTrendsConferenceParam } from "@/lib/cbb/conference-trends-shared";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string; conference?: string }>;
};

export default async function CbbTrendsPage({ searchParams }: PageProps) {
  const { scope, conference } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cbb"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
      cbbTrendsConference={readCbbTrendsConferenceParam(conference)}
    />
  );
}
