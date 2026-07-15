import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nfl", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NflInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nfl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
