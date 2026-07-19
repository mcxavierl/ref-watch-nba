import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { prepareTeamCrewPage } from "@/lib/league-pages/prepare-team-crew-page";
import { getTeam, NHL_TEAMS, teamFullName } from "@/lib/nhl/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return NHL_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return entityNotFoundMetadata("team", "nhl");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "nhl", teamName: name, abbr: team.abbr });
}

export default async function NhlTeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  await prepareTeamCrewPage("nhl", team.abbr);

  return <TeamCrewPage config={{ teamAbbr: team.abbr, league: "nhl" }} />;
}
