import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { getTeam, CFB_TEAMS, teamFullName } from "@/lib/cfb/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return CFB_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return { title: "Team not found | Ref Watch CFB" };
  }
  const name = teamFullName(team);
  return {
    title: `${name} official crew splits | Ref Watch CFB`,
    description: `How ${name} performs under different CFB official crews, scoring, penalties, and home/away records.`,
  };
}

export default async function NhlTeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  return <TeamCrewPage config={{ teamAbbr: team.abbr, league: "cfb" }} />;
}
