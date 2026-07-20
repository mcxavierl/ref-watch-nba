import { redirect } from "next/navigation";
import { isLeagueManifestId } from "@/lib/league-manifest";

type PageProps = {
  params: Promise<{ league: string; legacyFindingId: string }>;
};

/** Legacy /{league}/research/{findingId} URLs → /{league}/research/findings/{findingId} */
export default async function LegacyResearchFindingRedirect({ params }: PageProps) {
  const { league, legacyFindingId } = await params;
  if (!isLeagueManifestId(league)) {
    redirect("/");
  }
  redirect(`/${league}/research/findings/${legacyFindingId}`);
}
