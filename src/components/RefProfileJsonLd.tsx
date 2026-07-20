import { JsonLd } from "@/components/JsonLd";
import type { LeagueId } from "@/lib/leagues";
import { refProfileBreadcrumbJsonLd, refProfilePersonJsonLd } from "@/lib/seo";
import { refProfileDatasetJsonLd } from "@/lib/syndication";

type DataLeague = "NBA" | "NHL" | "WNBA" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

export function RefProfileJsonLd({
  leagueId,
  dataLeague,
  name,
  slug,
  number,
  games,
  lastUpdated,
}: {
  leagueId: LeagueId;
  dataLeague: DataLeague;
  name: string;
  slug: string;
  number?: string | number | null;
  games: number;
  lastUpdated: string;
}) {
  return (
    <JsonLd
      data={[
        refProfileDatasetJsonLd(name, slug, dataLeague, games, lastUpdated),
        refProfileBreadcrumbJsonLd(leagueId, name, slug),
        refProfilePersonJsonLd({ leagueId, name, slug, number }),
      ]}
    />
  );
}
