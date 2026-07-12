import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="nhl"
      defaultTab="findings"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
