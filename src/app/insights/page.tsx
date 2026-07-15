import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nba", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NbaInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nba"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
