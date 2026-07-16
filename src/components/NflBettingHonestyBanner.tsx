import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getRefStats } from "@/lib/nfl/data";
import {
  isNflHybridData,
  isNflSimulatedData,
  isNflVerifiedData,
} from "@/lib/nfl/data-source";

/** League-wide honesty strip for NFL betting splits (shown on every /nfl route). */
export function NflBettingHonestyBanner() {
  const stats = getRefStats();
  const { meta } = stats;
  const source = meta.source;

  if (isNflSimulatedData(source)) {
    return (
      <div className="data-source-banner data-source-banner--preview" role="status">
        <AlertTriangle className="data-source-banner-icon" aria-hidden />
        <p className="data-source-banner-text">
          <strong>NFL preview dataset.</strong> Schedules, crews, penalty splits,
          and betting stats are not verified against official records.{" "}
          <Link href="/methodology" className="data-source-banner-link">
            Methodology
          </Link>
        </p>
      </div>
    );
  }

  if (!isNflVerifiedData(source) && !isNflHybridData(source)) {
    return null;
  }

  if (!meta.atsAvailable) {
    return (
      <div className="data-source-banner" role="status">
        <AlertTriangle className="data-source-banner-icon" aria-hidden />
        <p className="data-source-banner-text">
          NFL scores and ref×team W-L are from ESPN game logs. ATS/O-U splits are
          not shown because verified closing lines are unavailable for this
          sample.
        </p>
      </div>
    );
  }

  return (
    <div className="data-source-banner data-source-banner--betting" role="status">
      <AlertTriangle className="data-source-banner-icon" aria-hidden />
      <p className="data-source-banner-text">
        <strong>Betting splits disclaimer.</strong> ATS/O-U uses nflverse
        historical closing lines on matched games only, not live sportsbook
        prices. Treat as exploratory historical context, not picks.{" "}
        {meta.note ? <span className="data-source-banner-detail">{meta.note}</span> : null}{" "}
        <Link href="/methodology" className="data-source-banner-link">
          Methodology
        </Link>
      </p>
    </div>
  );
}
