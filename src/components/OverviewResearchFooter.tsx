import { SiteNavLink } from "@/components/SiteNavLink";
import type { ReactNode } from "react";
import { LeagueChooser } from "@/components/LeagueChooser";
import { OverviewTopInsightsSection } from "@/components/OverviewTopInsightsSection";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { semanticBadgeSurfaceClass } from "@/lib/semantic-badge-colors";

type OverviewResearchFooterProps = {
  data: CrossLeagueOverview;
  exploreTabs: ReactNode;
};

export function OverviewResearchFooter({
  data,
  exploreTabs,
}: OverviewResearchFooterProps) {
  return (
    <footer
      className="overview-research-footer section-block"
      aria-labelledby="overview-research-footer-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <div className="overview-research-footer-header">
          <h2 className="overview-section-title" id="overview-research-footer-heading">
            Research Library &amp; League Explorer
          </h2>
          <span
            className={`overview-research-footer-badge ${semanticBadgeSurfaceClass("research")}`}
          >
            Deep research
          </span>
        </div>
        <p className="overview-section-lead">
          League hubs, ranked lists, and the full competition catalog. Secondary navigation
          for deeper dives.
        </p>
      </div>

      <LeagueChooser cards={data.leagueCards} placement="default" />

      <OverviewTopInsightsSection data={data} />

      <div className="overview-research-footer-explore">{exploreTabs}</div>

      <p className="overview-research-footer-links">
        <SiteNavLink href="/methodology" className="overview-research-footer-link rw-focus-ring">
          Methodology
        </SiteNavLink>
        <SiteNavLink href="/research/validation" className="overview-research-footer-link rw-focus-ring">
          Validation report
        </SiteNavLink>
        <SiteNavLink href="/about" className="overview-research-footer-link rw-focus-ring">
          About RefWatch
        </SiteNavLink>
      </p>
    </footer>
  );
}
