import type { Metadata } from "next";
import { entityNotFoundMetadata, teamProfileMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { TeamCrewPage } from "@/components/TeamCrewPage";
import { getTeam, NFL_TEAMS, teamFullName } from "@/lib/nfl/teams";
import { hydrateScopedGameLogs } from "@/lib/scoped-game-log-hydrate";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return NFL_TEAMS.map((team) => ({ abbr: team.abbr }));
}

/** Scope query params require request-time rendering. */
export const dynamic = "force-dynamic";

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
  searchParams,
}: {
  params: Promise<{ abbr: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { abbr } = await params;
  const { scope } = await searchParams;
  const team = getTeam(abbr);
  if (!team) notFound();
  const scopeMode = readSeasonScopeParam(scope, "nfl", { teamAbbr: team.abbr });
  await hydrateScopedGameLogs(SITE_URL, "nfl", scopeMode, {
    teamAbbr: team.abbr,
  });

  return (
    <TeamCrewPage
      config={{ teamAbbr: team.abbr, league: "nfl" }}
      scopeMode={scopeMode}
    />
  );
}
