import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nba", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NbaRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nba"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
