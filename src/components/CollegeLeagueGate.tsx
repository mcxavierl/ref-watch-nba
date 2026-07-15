import Link from "next/link";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

type NcaaRouteLeague = Extract<LeagueId, "cbb" | "cfb">;

export function CollegeLeagueGate({
  leagueId,
}: {
  leagueId: NcaaRouteLeague;
  children: React.ReactNode;
}) {
  const league = LEAGUES[leagueId];

  return (
    <div className="page-shell">
      <section className="page-hero max-w-2xl">
        <p className="section-kicker">Coming soon</p>
        <h1 className="page-title">{league.label}</h1>
        <p className="page-lead">
          This league hub is not live yet. Check back when NCAA coverage launches.
        </p>
      </section>

      <nav className="mt-8">
        <Link href="/" className="site-footer-inline-link">
          Return to overview →
        </Link>
      </nav>
    </div>
  );
}
