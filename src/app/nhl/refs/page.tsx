import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nhl", "refs");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NhlRefsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId="nhl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
