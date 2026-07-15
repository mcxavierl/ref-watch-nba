import { InsightsHubPage } from "@/components/InsightsHubRoute";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("cfb", "insights");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function CfbInsightsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="cfb"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
