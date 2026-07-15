import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="nhl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
