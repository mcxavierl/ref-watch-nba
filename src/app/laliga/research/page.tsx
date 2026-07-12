import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("laliga", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LaligaResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="laliga"
      defaultTab="findings"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
