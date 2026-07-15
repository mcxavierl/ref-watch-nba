import { InsightsHubPage } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlTrendsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nhl"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
