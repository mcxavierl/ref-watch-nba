import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("laliga", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LaligaInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="laliga"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
