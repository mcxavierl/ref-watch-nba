import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nfl", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NflRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nfl"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
