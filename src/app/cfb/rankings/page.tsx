import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cfb", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CfbRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cfb"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
