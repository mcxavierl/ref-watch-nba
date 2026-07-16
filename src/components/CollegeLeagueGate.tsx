import Link from "next/link";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { NCAA_INTEGRITY_AUDIT_HREF } from "@/lib/ncaa-audit-status-display";
import { isCollegeLiveLeague } from "@/lib/verified-live-leagues";

type NcaaRouteLeague = Extract<LeagueId, "cbb" | "cfb">;

export function CollegeLeagueGate({
  leagueId,
  children,
}: {
  leagueId: NcaaRouteLeague;
  children: React.ReactNode;
}) {
  if (isCollegeLiveLeague(leagueId)) {
    return <>{children}</>;
  }

  const league = LEAGUES[leagueId];

  return (
    <div className="page-shell">
      <section className="page-hero max-w-2xl">
        <p className="section-kicker">Coming soon</p>
        <h1 className="page-title">{league.label}</h1>
        <p className="page-lead">
          This league hub is not live yet. Check back when NCAA coverage launches.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge verdict="caution" label="Pending verification" compact />
          <Link
            href={`${NCAA_INTEGRITY_AUDIT_HREF}#${leagueId}`}
            className="text-sm font-medium text-zinc-700 hover:text-raptors hover:underline"
          >
            View integrity audit →
          </Link>
        </div>
      </section>

      <nav className="mt-8">
        <Link href="/" className="site-footer-inline-link">
          Return to overview →
        </Link>
      </nav>
    </div>
  );
}
