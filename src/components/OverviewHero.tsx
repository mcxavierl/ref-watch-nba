import Link from "next/link";

export function OverviewHero() {
  return (
    <section className="overview-hero-minimal section-block" aria-labelledby="overview-hero-heading">
      <div className="overview-hero-minimal-copy">
        <h1 className="overview-title" id="overview-hero-heading">
          Verified Officiating Analytics
        </h1>
        <p className="overview-hero-minimal-bridge">
          Live league hubs with matrix, rankings, and ref profiles — pick a sport below.
        </p>
      </div>
      <Link href="#overview-league-chooser-heading" className="overview-hero-minimal-cta rw-focus-ring">
        Browse league hubs
      </Link>
    </section>
  );
}
