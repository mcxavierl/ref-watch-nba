import Link from "next/link";
import type { ReactNode } from "react";
import { LeagueChooser } from "@/components/LeagueChooser";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import {
  DashboardBodyLayout,
  DashboardSection,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";
import {
  catalogComingSoonEntries,
  catalogCompetitionCount,
  catalogLiveCompetitionEntries,
  catalogProLiveEntries,
  catalogStatusLabel,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { leagueHubHref } from "@/lib/leagues";
import "@/components/overview-dashboard.css";

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
  highlightsTicker?: ReactNode;
  topStories: ReactNode;
  secondaryTabs: ReactNode;
};

export function OverviewDashboard({
  data,
  hero,
  highlightsTicker,
  topStories,
  secondaryTabs,
}: OverviewDashboardProps) {
  const proCatalog = catalogProLiveEntries();
  const liveCatalog = catalogLiveCompetitionEntries();
  const comingSoonCatalog = catalogComingSoonEntries().slice(0, 8);

  return (
    <DashboardShell>
      {hero}

      {highlightsTicker ? (
        <div className="overview-dashboard-breathe overview-dashboard-breathe--tight">
          {highlightsTicker}
        </div>
      ) : null}

      <div className="overview-dashboard-breathe overview-dashboard-breathe--tight">
        <LeagueChooser cards={data.leagueCards} />
      </div>

      <div className="overview-dashboard-breathe">{topStories}</div>

      <DashboardBodyLayout
        sidebar={
          <>
            <details className="overview-sidebar-block overview-catalog-collapsible overview-catalog--coverage" open>
              <summary className="overview-sidebar-heading overview-catalog-summary">
                <span className="overview-catalog-summary-copy">
                  <h2 className="overview-catalog-summary-title">League catalog</h2>
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
                  <h3 className="overview-catalog-segment-title">Live competitions</h3>
                  <div className="overview-catalog-list">
                    {proCatalog.map((entry) => (
                      <CatalogLeagueRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                </section>

                {comingSoonCatalog.length > 0 ? (
                  <section className="overview-catalog-segment overview-catalog-segment--soon">
                    <h3 className="overview-catalog-segment-title">On the roadmap</h3>
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
        main={
          <>
            {secondaryTabs}

            <DashboardSection
              className="overview-expansion overview-section--secondary"
              title="Expanding coverage"
              titleId="overview-expansion-heading"
              lead="More soccer leagues and college sports on the roadmap."
            >
              <div className="overview-expansion-grid">
                {liveCatalog.map((entry) =>
                  entry.leagueId ? (
                    <Link
                      key={entry.id}
                      href={leagueHubHref(entry.leagueId)}
                      className="overview-expansion-live rw-focus-ring"
                    >
                      <span className="overview-expansion-live-label">{entry.label}</span>
                      <LeagueSeasonStartBadge leagueId={entry.leagueId} />
                    </Link>
                  ) : null,
                )}
                {comingSoonCatalog.map((entry) => (
                  <div key={entry.id} className="overview-expansion-soon">
                    <span className="overview-expansion-soon-label">{entry.label}</span>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </>
        }
      />
    </DashboardShell>
  );
}
