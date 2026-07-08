import { formatDate } from "@/lib/data";

export function RefProfileMetadataBar({
  seasons,
  games,
  lastUpdated,
}: {
  seasons: string[];
  games: number;
  lastUpdated: string;
  seeded?: boolean;
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
    </div>
  );
}
