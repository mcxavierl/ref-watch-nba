import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { hydrateScopedGameLogs } from "@/lib/scoped-game-log-hydrate";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { SITE_URL } from "@/lib/site";
import { getTeam, NBA_TEAMS, teamFullName } from "@/lib/teams";

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
    return entityNotFoundMetadata("team", "nba");
  }
  const name = teamFullName(team);
  return teamProfileMetadata({ leagueId: "nba", teamName: name, abbr: team.abbr });
}

export default async function TeamPage({
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
  const scopeMode = readSeasonScopeParam(scope);
  await hydrateScopedGameLogs(SITE_URL, "nba", scopeMode, {
    teamAbbr: team.abbr,
  });

  return (
    <TeamCrewPage
      config={{ teamAbbr: team.abbr }}
      scopeMode={scopeMode}
    />
  );
}
