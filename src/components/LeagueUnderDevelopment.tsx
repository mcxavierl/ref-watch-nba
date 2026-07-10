import Link from "next/link";

export function LeagueUnderDevelopment({ leagueLabel }: { leagueLabel: string }) {
  return (
    <div className="page-shell">
      <section className="page-hero max-w-2xl">
        <p className="section-kicker">Under development</p>
        <h1 className="page-title">{leagueLabel} is under development</h1>
        <p className="page-lead">
          Ref profiles, crew splits, and analytics will publish here once
          verified data ingest ships.
        </p>
      </section>

      <nav className="mt-8">
        <Link href="/" className="site-footer-inline-link">
          Return to NBA home →
        </Link>
      </nav>
    </div>
  );
}
