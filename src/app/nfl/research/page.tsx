import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nfl", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NflResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="nfl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
