import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("epl", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function EplRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="epl"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
