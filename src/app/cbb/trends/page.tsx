import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cbb", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CbbTrendsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cbb"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
