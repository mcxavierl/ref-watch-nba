import { JsonLd } from "@/components/JsonLd";
import type { LeagueId } from "@/lib/leagues";
import { teamProfileBreadcrumbJsonLd, teamProfileSportsTeamJsonLd } from "@/lib/seo";

export function TeamProfileJsonLd({
  leagueId,
  teamName,
  abbr,
}: {
  leagueId: LeagueId;
  teamName: string;
  abbr: string;
}) {
  return (
    <JsonLd
      data={[
        teamProfileBreadcrumbJsonLd(leagueId, teamName, abbr),
        teamProfileSportsTeamJsonLd(leagueId, teamName, abbr),
      ]}
    />
  );
}
