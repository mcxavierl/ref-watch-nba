import Link from "next/link";
import type { ReactNode } from "react";
import { LeagueChooser } from "@/components/LeagueChooser";
import { OverviewEditorialNarrative } from "@/components/OverviewEditorialNarrative";
import { OverviewQuickInsights } from "@/components/OverviewQuickInsights";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { OverviewUpcomingSlateSection } from "@/components/OverviewUpcomingSlateSection";
import {
  DashboardBodyLayout,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";
import {
  catalogComingSoonEntries,
  catalogCompetitionCount,
  catalogProLiveEntries,
  catalogStatusLabel,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import "@/components/overview-dashboard.css";
import "@/components/overview-clinical-modern.css";

function CatalogLeagueRow({ entry }: { entry: CatalogLeagueEntry }) {
  const rowClass = [
    "overview-catalog-row",
    entry.status === "live" ? "overview-catalog-row--live" : "overview-catalog-row--static",
    entry.href && entry.status !== "coming-soon" ? "overview-catalog-row--link" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <span className="overview-catalog-row-main">
        {entry.leagueId ? (
          <span className="overview-catalog-mark" aria-hidden>
            <LeagueNavMark league={entry.leagueId} active={false} />
          </span>
        ) : (
          <span className="overview-catalog-mark overview-catalog-mark--soon" aria-hidden />
        )}
        <span className="overview-catalog-name">{entry.label}</span>
      </span>
      <span className="overview-catalog-meta">
        <span className={`overview-catalog-status overview-catalog-status--${entry.status}`}>
          {catalogStatusLabel(entry)}
        </span>
      </span>
    </>
  );

  if (entry.href && entry.status !== "coming-soon") {
    return (
      <Link
        href={entry.href}
        className={rowClass}
        data-league={entry.leagueId}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={rowClass} data-league={entry.leagueId}>
      {inner}
    </div>
  );
}

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
  hero: ReactNode;
  exploreTabs: ReactNode;
};

export function OverviewDashboard({
  data,
  hero,
  exploreTabs,
}: OverviewDashboardProps) {
  const proCatalog = catalogProLiveEntries();
  const comingSoonCatalog = catalogComingSoonEntries().slice(0, 8);

  return (
    <DashboardShell>
      {hero}

      <OverviewUpcomingSlateSection data={data} />

      <LeagueChooser cards={data.leagueCards} placement="primary" />

      <div className="overview-dashboard-league-to-insight">
        <OverviewEditorialNarrative insightCards={data.insightCards} />
      </div>

      <section
        className="overview-editorial-section overview-editorial-section--explore section-block"
        aria-labelledby="overview-explore-heading"
      >
        <div className="overview-section-header overview-section-header--primary">
          <h2 className="overview-section-title" id="overview-explore-heading">
            Explore
          </h2>
          <p className="overview-section-lead">
            Jump into league hubs, quick lists, schedules, and the full competition catalog.
          </p>
        </div>

        <div className="overview-explore-stack">
          <OverviewQuickInsights
            insightCards={data.insightCards}
            topStories={data.topStories}
          />

          <DashboardBodyLayout
            sidebar={
              <>
                <details className="overview-sidebar-block overview-catalog-collapsible overview-catalog--coverage" open>
                  <summary className="overview-sidebar-heading overview-catalog-summary">
                    <span className="overview-catalog-summary-copy">
                      <h3 className="overview-catalog-summary-title">League catalog</h3>
                      <span className="overview-catalog-summary-hint">Live verified hubs</span>
                    </span>
                    <span
                      className="overview-sidebar-count"
                      aria-label={`${catalogCompetitionCount()} leagues tracked`}
                    >
                      {catalogCompetitionCount()}
                    </span>
                  </summary>

                  <div className="overview-catalog-segments">
                    <section className="overview-catalog-segment overview-catalog-segment--live">
                      <h4 className="overview-catalog-segment-title">Live competitions</h4>
                      <div className="overview-catalog-list">
                        {proCatalog.map((entry) => (
                          <CatalogLeagueRow key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </section>

                    {comingSoonCatalog.length > 0 ? (
                      <section className="overview-catalog-segment overview-catalog-segment--soon">
                        <h4 className="overview-catalog-segment-title">On the roadmap</h4>
                        <div className="overview-catalog-list">
                          {comingSoonCatalog.map((entry) => (
                            <CatalogLeagueRow key={entry.id} entry={entry} />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                </details>
              </>
            }
            main={exploreTabs}
          />
        </div>
      </section>
    </DashboardShell>
  );
}
