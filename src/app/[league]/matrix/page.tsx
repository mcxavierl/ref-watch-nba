import { notFound } from "next/navigation";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { importMatrixPage } from "@/lib/league-route-delegates";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) return {};
  const mod = await importMatrixPage(league);
  return mod.generateMetadata?.(props) ?? {};
}

export default async function LeagueMatrixPage(props: PageProps) {
  const { league } = await props.params;
  if (!isLeagueManifestId(league)) notFound();
  const mod = await importMatrixPage(league);
  return mod.default(props);
}
