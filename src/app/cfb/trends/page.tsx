import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cfb", "trends");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CfbTrendsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cfb"
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
