import Link from "next/link";
import { StatusBadge } from "@/components/hub/StatusBadge";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";

type CoverageComingSoonProps = {
  leagueId: LeagueId;
  teamLabel?: string;
};

export function CoverageComingSoon({
  leagueId,
  teamLabel,
}: CoverageComingSoonProps) {
  const league = LEAGUES[leagueId];

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="section-kicker">Coverage scope</p>
        <h1 className="page-title">{league.label}</h1>
        <p className="page-lead">
          {teamLabel
            ? `${teamLabel} is outside the current key-conferences launch window.`
            : "This program is outside the current key-conferences launch window."}
        </p>
      </section>

      <div className="data-source-banner data-source-banner--preview" role="status">
        <StatusBadge verdict="caution" label="Coverage coming soon" compact />
        <p className="data-source-banner-text">
          Ref Watch NCAA launches conference by conference. Live hubs currently track key
          conferences only.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href={league.pathPrefix || "/"} className="site-footer-inline-link">
          Back to {league.shortLabel} hub →
        </Link>
        <Link href="/" className="site-footer-inline-link">
          Multi-league overview →
        </Link>
      </nav>
    </div>
  );
}
