import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { prepareTeamCrewPage } from "@/lib/league-pages/prepare-team-crew-page";
import { getTeam, WNBA_TEAMS, teamFullName } from "@/lib/wnba/teams";

export const dynamic = "force-static";

export function generateStaticParams() {
  return WNBA_TEAMS.map((team) => ({ abbr: team.abbr }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const team = getTeam(abbr);
  if (!team) {
    return entityNotFoundMetadata("team", "wnba");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "wnba", teamName: name, abbr: team.abbr });
}

export default async function WnbaTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ abbr: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { abbr } = await params;
  const { scope } = await searchParams;
  const team = getTeam(abbr);
  if (!team) notFound();

  const { readSeasonScopeParam } = await import("@/lib/season-scope");
  const scopeMode = readSeasonScopeParam(scope);
  await prepareTeamCrewPage("wnba", team.abbr, scopeMode);

  return (
    <TeamCrewPage
      config={{ teamAbbr: team.abbr, league: "wnba" }}
      scopeMode={scopeMode}
    />
  );
}
