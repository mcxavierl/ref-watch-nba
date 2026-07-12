import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "research");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CbbResearchPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="cbb"
      defaultTab="findings"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
