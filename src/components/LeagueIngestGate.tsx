import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ingestTicketUrl, resolveLeagueVerification } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getRefStats as getNbaRefStats } from "@/lib/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { shouldShowUnverifiedData } from "@/lib/show-unverified";
import type { RefStatsFile } from "@/lib/types";

const REF_LOADERS: Partial<
  Record<LeagueId, () => RefStatsFile>
> = {
  nba: getNbaRefStats,
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
};

type GatedLeagueId = "nhl" | "nfl";

export function LeagueIngestGate({
  leagueId,
  children,
  searchParams,
}: {
  leagueId: GatedLeagueId;
  children: React.ReactNode;
  searchParams?: { preview?: string | string[] | null };
}) {
  const stats = REF_LOADERS[leagueId]!();
  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const preview = shouldShowUnverifiedData(searchParams);

  if (verification.data_verified || preview) {
    return <>{children}</>;
  }

  const league = LEAGUES[leagueId];
  const ticket = ingestTicketUrl(leagueId);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="section-kicker">Data ingest</p>
        <h1 className="page-title">{league.label}</h1>
        <p className="page-lead">
          Verified {league.label} officiating data is not live yet. Ref profiles,
          team splits, and charts stay hidden until the real-source ingest ships.
        </p>
      </section>

      <div
        className="data-source-banner data-source-banner--preview"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="data-source-banner-icon" aria-hidden />
        <p className="data-source-banner-text">
          <strong>Data ingest in progress.</strong> Verified {league.label} data
          ships in{" "}
          {ticket ? (
            <a href={ticket} className="data-source-banner-link">
              the NHL/NFL ingest ticket
            </a>
          ) : (
            "an upcoming release"
          )}
          . No numbers are shown from synthetic sources in production.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/" className="site-footer-inline-link">
          NBA home →
        </Link>
        <Link href="/epl" className="site-footer-inline-link">
          EPL →
        </Link>
      </nav>
    </div>
  );
}
