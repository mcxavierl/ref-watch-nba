import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { CoverageComingSoon } from "@/components/CoverageComingSoon";
import { teamInLiveNcaaConference } from "@/lib/ncaa-conference-gate";
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
    return entityNotFoundMetadata("team", "cfb");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "cfb", teamName: name, abbr: team.abbr });
}

export default async function CfbTeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  if (!teamInLiveNcaaConference("cfb", team.abbr)) {
    return (
      <CoverageComingSoon
        leagueId="cfb"
        teamLabel={teamFullName(team)}
      />
    );
  }

  return <TeamCrewPage config={{ teamAbbr: team.abbr, league: "cfb" }} />;
}
