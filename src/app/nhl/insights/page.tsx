import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nhl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
