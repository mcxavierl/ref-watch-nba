import { SiteNavLink as Link } from "@/components/SiteNavLink";
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
