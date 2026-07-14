import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { CoverageComingSoon } from "@/components/CoverageComingSoon";
import { teamInLiveNcaaConference } from "@/lib/ncaa-conference-gate";
import { getTeam, CBB_TEAMS, teamFullName } from "@/lib/cbb/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return CBB_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return entityNotFoundMetadata("team", "cbb");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "cbb", teamName: name, abbr: team.abbr });
}

export default async function CbbTeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  if (!teamInLiveNcaaConference("cbb", team.abbr)) {
    return (
      <CoverageComingSoon
        leagueId="cbb"
        teamLabel={teamFullName(team)}
      />
    );
  }

  return <TeamCrewPage config={{ teamAbbr: team.abbr }} />;
}
