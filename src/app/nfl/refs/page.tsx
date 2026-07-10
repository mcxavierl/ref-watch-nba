import { RefsHubPage } from "@/components/RefsHubPage";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("nfl", "refs");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NflRefsPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "nfl");
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId="nfl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
