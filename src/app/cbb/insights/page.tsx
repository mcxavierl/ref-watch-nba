import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CbbInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="cbb"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
