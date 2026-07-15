import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("epl", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function EplInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="epl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
