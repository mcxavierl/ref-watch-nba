import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { getTeam, NHL_TEAMS, teamFullName } from "@/lib/nhl/teams";

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
    return { title: "Team not found — Ref Watch NHL" };
  }
  const name = teamFullName(team);
  return {
    title: `${name} official crew splits — Ref Watch NHL`,
    description: `How ${name} performs under different NHL official crews — goals, PIM, and home/away records.`,
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

  return <TeamCrewPage config={{ teamAbbr: team.abbr, league: "nhl" }} />;
}
