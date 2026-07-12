import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "rankings");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlRankingsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <InsightsHubPage
      leagueId="nhl"
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
