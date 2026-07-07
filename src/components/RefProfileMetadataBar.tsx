import { formatDate } from "@/lib/data";

export function RefProfileMetadataBar({
  seasons,
  games,
  lastUpdated,
  seeded,
}: {
  seasons: string[];
  games: number;
  lastUpdated: string;
  seeded: boolean;
}) {
  return (
    <div className="ref-profile-meta">
      <span
        className={
          seeded ? "ref-profile-meta-badge ref-profile-meta-badge--seeded" : "ref-profile-meta-badge ref-profile-meta-badge--live"
        }
      >
        {seeded ? "Historical data" : "Live data"}
      </span>
      <span className="ref-profile-meta-item">
        {games.toLocaleString()} games analyzed
      </span>
      <span className="ref-profile-meta-item">
        Seasons {seasons.join(", ")}
      </span>
      <span className="ref-profile-meta-item">
        Updated {formatDate(lastUpdated)}
      </span>
    </div>
  );
}
