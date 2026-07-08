import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  leagueDataSourceBannerMessage,
  type DataSourceBannerLeague,
} from "@/lib/data-source-banner";
import type { RefStatsFile } from "@/lib/types";

export function LeagueDataSourceBanner({
  league,
  meta,
  className = "",
}: {
  league: DataSourceBannerLeague;
  meta: RefStatsFile["meta"];
  className?: string;
}) {
  const message = leagueDataSourceBannerMessage(league, meta);
  if (!message) return null;

  return (
    <div
      className={`data-source-banner ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="data-source-banner-icon" aria-hidden />
      <p className="data-source-banner-text">
        {message}{" "}
        <Link href="/methodology" className="data-source-banner-link">
          Methodology
        </Link>
      </p>
    </div>
  );
}
