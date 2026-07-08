import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  leagueDataSourceBannerMessage,
  type DataSourceBannerLeague,
} from "@/lib/data-source-banner";
import { resolveLeagueVerification } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
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
  const verification = resolveLeagueVerification(league as LeagueId, meta);
  const isUnverified = !verification.data_verified;

  if (!message && !isUnverified) return null;

  return (
    <div
      className={`data-source-banner${isUnverified ? " data-source-banner--preview" : ""} ${className}`.trim()}
      role={isUnverified ? "alert" : "status"}
      aria-live={isUnverified ? "assertive" : "polite"}
    >
      <AlertTriangle className="data-source-banner-icon" aria-hidden />
      <p className="data-source-banner-text">
        {isUnverified && (
          <strong>Synthetic data — not from official sources. </strong>
        )}
        {message}{" "}
        <Link href="/methodology" className="data-source-banner-link">
          Methodology
        </Link>
      </p>
    </div>
  );
}
