import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("epl", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function EplResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="epl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
