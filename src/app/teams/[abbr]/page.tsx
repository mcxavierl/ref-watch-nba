import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { getTeam, NBA_TEAMS, teamFullName } from "@/lib/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return NBA_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return { title: "Team not found | Ref Watch NBA" };
  }
  const name = teamFullName(team);
  return {
    title: `${name} ref crew splits | Ref Watch NBA`,
    description: `How ${name} performs under different referee crews: scoring, fouls, and home/away records.`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  return <TeamCrewPage config={{ teamAbbr: team.abbr }} />;
}
