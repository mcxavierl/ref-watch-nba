import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { getTeam, NFL_TEAMS, teamFullName } from "@/lib/nfl/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return NFL_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return entityNotFoundMetadata("team", "nfl");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "nfl", teamName: name, abbr: team.abbr });
}

export default async function NflTeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  return <TeamCrewPage config={{ teamAbbr: team.abbr, league: "nfl" }} />;
}
