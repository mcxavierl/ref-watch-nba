import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("laliga", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LaligaRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="laliga"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
