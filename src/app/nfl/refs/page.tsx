import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("nfl", "refs");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NflRefsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId="nfl"
      scopeMode={readSeasonScopeParam(scope, "nfl")}
    />
  );
}
