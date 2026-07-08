import Link from "next/link";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";

const REF_LOADERS = {
  cbb: getCbbRefStats,
  cfb: getCfbRefStats,
} as const;

type CollegeLeagueId = keyof typeof REF_LOADERS;

export function CollegeLeagueGate({
  leagueId,
  children,
}: {
  leagueId: CollegeLeagueId;
  children: React.ReactNode;
}) {
  const stats = REF_LOADERS[leagueId]();
  if (stats.refs.length > 0) {
    return <>{children}</>;
  }

  const league = LEAGUES[leagueId as LeagueId];

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="section-kicker">Preview</p>
        <h1 className="page-title">{league.label}</h1>
        <p className="page-lead">
          Ref and crew analytics have not shipped for this league yet. Team
          directories exist, but there is no officiating sample to explore.
        </p>
      </section>

      <div className="data-source-banner data-source-banner--preview" role="status">
        <p className="data-source-banner-text">
          <strong>Not live data.</strong> This league is hidden from the header
          switcher until ref profiles and game logs are loaded. Use NBA, NHL, NFL,
          or EPL coverage in the meantime.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/" className="site-footer-inline-link">
          NBA home →
        </Link>
        <Link href="/nhl" className="site-footer-inline-link">
          NHL →
        </Link>
        <Link href="/nfl" className="site-footer-inline-link">
          NFL →
        </Link>
        <Link href="/epl" className="site-footer-inline-link">
          EPL →
        </Link>
      </nav>
    </div>
  );
}
