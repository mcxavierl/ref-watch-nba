import { InsightsHubPage } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("laliga", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LaligaInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="laliga"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
