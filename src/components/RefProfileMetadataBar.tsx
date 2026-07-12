import { RefCompareLink } from "@/components/RefCompareLink";
import { formatDate } from "@/lib/data";
import type { LeagueId } from "@/lib/leagues";

export function RefProfileMetadataBar({
  seasons,
  games,
  lastUpdated,
  leagueId,
  slug,
}: {
  seasons: string[];
  games: number;
  lastUpdated: string;
  seeded?: boolean;
  leagueId?: LeagueId;
  slug?: string;
}) {
  return (
    <div className="ref-profile-meta">
      <span className="ref-profile-meta-item">
        {games.toLocaleString()} games analyzed
      </span>
      <span className="ref-profile-meta-item">
        Seasons {seasons.join(", ")}
      </span>
      <span className="ref-profile-meta-item ref-profile-meta-updated">
        Updated {formatDate(lastUpdated)}
      </span>
      {leagueId && slug ? (
        <RefCompareLink
          leagueId={leagueId}
          slug={slug}
          className="ref-profile-meta-item ref-compare-entry-link"
        />
      ) : null}
    </div>
  );
}
