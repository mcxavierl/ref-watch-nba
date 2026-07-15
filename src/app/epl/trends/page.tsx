import { InsightsHubPage } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("epl", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function EplTrendsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="epl"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
