import Link from "next/link";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import { HOMEPAGE_METHODOLOGY_BLURB } from "@/lib/homepage-insight-gates";
import { REFWATCH_AUDIENCE } from "@/lib/trust-charter";

export function OverviewHero() {
  return (
    <section className="overview-hero-minimal section-block" aria-labelledby="overview-hero-heading">
      <div className="overview-hero-minimal-copy">
        <h1 className="overview-title" id="overview-hero-heading">
          Verified Officiating Analytics
        </h1>
        <p className="overview-hero-minimal-bridge">
          Live league hubs with matrix, rankings, and ref profiles. We decompose variance in
          high-leverage game states with published sample gates.
        </p>
        <p className="overview-hero-minimal-bridge overview-hero-minimal-bridge--supporting">
          {HOMEPAGE_METHODOLOGY_BLURB}{" "}
          <Link href="/methodology" className="trust-charter-link">
            Methodology
          </Link>
          {" · "}
          <Link href="/research/validation" className="trust-charter-link">
            Closing-line validation
          </Link>
        </p>
        <p className="overview-hero-minimal-bridge overview-hero-minimal-bridge--meta">
          {REFWATCH_AUDIENCE}
        </p>
        <TrustCharterSummary />
      </div>
    </section>
  );
}
