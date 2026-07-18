import { notFound } from "next/navigation";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { importTeamProfilePage } from "@/lib/league-route-delegates";

type PageProps = {
  params: Promise<{ league: string; abbr: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateStaticParams() {
  const leagues = ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb"] as const;
  const params: Array<{ league: string; abbr: string }> = [];
  for (const league of leagues) {
    const mod = await importTeamProfilePage(league);
    const staticParams = mod.generateStaticParams?.() ?? [];
    for (const entry of staticParams) {
      if ("abbr" in entry) {
        params.push({ league, abbr: entry.abbr });
      }
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) return {};
  const mod = await importTeamProfilePage(league);
  return mod.generateMetadata?.(props) ?? {};
}

export default async function LeagueTeamProfilePage(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) notFound();
  const mod = await importTeamProfilePage(league);
  return mod.default(props);
}
