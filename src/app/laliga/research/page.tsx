import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("laliga", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LaligaResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="laliga"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
