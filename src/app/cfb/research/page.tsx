import { InsightsResearchPage } from "@/components/InsightsResearchPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cfb", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CfbResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsResearchPage
      leagueId="cfb"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
