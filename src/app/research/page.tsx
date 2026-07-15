import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nba", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NbaResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="nba"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
