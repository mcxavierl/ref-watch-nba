import { notFound } from "next/navigation";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { importRefProfilePage } from "@/lib/league-route-delegates";

type PageProps = {
  params: Promise<{ league: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateStaticParams() {
  const leagues = ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb"] as const;
  const params: Array<{ league: string; slug: string }> = [];
  for (const league of leagues) {
    const mod = await importRefProfilePage(league);
    const staticParams = mod.generateStaticParams?.() ?? [];
    for (const entry of staticParams) {
      if ("slug" in entry) {
        params.push({ league, slug: entry.slug });
      }
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) return {};
  const mod = await importRefProfilePage(league);
  return mod.generateMetadata?.(props) ?? {};
}

export default async function LeagueRefProfilePage(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) notFound();
  const mod = await importRefProfilePage(league);
  return mod.default(props);
}
