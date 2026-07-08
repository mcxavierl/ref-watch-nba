import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

export const metadata = hubPageMetadata("epl", "refs");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function EplRefsPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId="epl"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
