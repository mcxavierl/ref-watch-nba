import { InsightsHubPage } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nba", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NbaTrendsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nba"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
