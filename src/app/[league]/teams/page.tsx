import { notFound } from "next/navigation";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { importTeamsPage } from "@/lib/league-route-delegates";
import { prepareTeamsIndexPage } from "@/lib/league-pages/prepare-teams-index-page";

type PageProps = {
  params: Promise<{ league: string }>;
};

export async function generateMetadata(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) return {};
  const mod = await importTeamsPage(league);
  return mod.generateMetadata?.(props) ?? {};
}

export default async function LeagueTeamsPage(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) notFound();
  await prepareTeamsIndexPage(league);
  const mod = await importTeamsPage(league);
  return mod.default(props);
}
