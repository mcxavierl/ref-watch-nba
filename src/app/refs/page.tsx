import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nba", "refs");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function RefsIndexPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId="nba"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
