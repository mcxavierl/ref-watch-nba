import Link from "next/link";
import { LeagueChooser } from "@/components/LeagueChooser";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { OverviewComparativeScorecard } from "@/components/OverviewComparativeScorecard";
import { WorldCupResearchHubCard } from "@/components/WorldCupResearchHubCard";
import { OverviewQuickLists } from "@/components/OverviewQuickLists";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
import { OverviewTopStoriesCarousel } from "@/components/OverviewTopStoriesCarousel";
import { DashboardHeroHighlights } from "@/components/dashboard/DashboardHeroHighlights";
import {
  DashboardBodyLayout,
  DashboardSection,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";
import {
  catalogComingSoonEntries,
  catalogCollegeLiveEntries,
  catalogCompetitionCount,
  catalogLiveCompetitionEntries,
  catalogProLiveEntries,
  catalogStatusLabel,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, overviewGamesSectionTitle } from "@/lib/leagues";
import { CalendarDays } from "lucide-react";
import "@/components/overview-dashboard.css";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

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
};

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const proCatalog = catalogProLiveEntries();
  const collegeCatalog = catalogCollegeLiveEntries();
  const liveCatalog = catalogLiveCompetitionEntries();
  const comingSoonCatalog = catalogComingSoonEntries().slice(0, 6);
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));

  return (
    <DashboardShell>
      <OverviewTopStoriesCarousel
        initialData={{
          insights: data.topStories,
          status: data.topStoriesStatus,
          generatedAt: data.topStoriesGeneratedAt,
        }}
      />

      <div className="overview-dashboard-breathe">
        <DashboardHeroHighlights />
      </div>

      <div className="overview-dashboard-breathe">
        <LeagueChooser cards={data.leagueCards} />
      </div>

      <DashboardBodyLayout
        sidebar={
          <>
            <details className="overview-sidebar-block overview-catalog-collapsible overview-catalog--coverage" open>
              <summary className="overview-sidebar-heading overview-catalog-summary">
                <span className="overview-catalog-summary-copy">
                  <span className="overview-catalog-summary-title">League catalog</span>
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

                {collegeCatalog.length > 0 ? (
                  <section className="overview-catalog-segment overview-catalog-segment--college">
                    <h3 className="overview-catalog-segment-title">College sports</h3>
                    <p className="overview-catalog-segment-hint">
                      Live NCAA basketball and football hubs.
                    </p>
                    <div className="overview-catalog-list">
                      {collegeCatalog.map((entry) => (
                        <CatalogLeagueRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </section>
                ) : null}

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

            <section className="overview-sidebar-block overview-sidebar-block--lists overview-quicklists-panel">
              <h2 className="overview-sidebar-heading overview-sidebar-heading--static overview-sidebar-heading--quicklists">
                Quick lists
              </h2>
              <p className="overview-sidebar-note">
                Live-league shortcuts: rankings, tendencies, and matrix edges for verified
                pro and college hubs across all seven live competitions.
              </p>
              <OverviewQuickLists
                leagueCards={data.leagueCards}
                insightCards={data.insightCards}
              />
            </section>
          </>
        }
        main={
          <>
            <section className="overview-quicklists-mobile section-block">
              <div className="overview-section-header">
                <h2 className="overview-section-title">Quick lists</h2>
                <p className="overview-section-lead">
                  Rankings, tendencies, and matrix edges for live leagues across basketball,
                  hockey, football, and soccer.
                </p>
              </div>
              <OverviewQuickLists
                leagueCards={data.leagueCards}
                insightCards={data.insightCards}
              />
            </section>

            <section className="overview-slate section-block" aria-labelledby="overview-slate-heading">
              <div className="overview-section-header">
                <h2 className="overview-section-title" id="overview-slate-heading">
                  <CalendarDays aria-hidden className="overview-slate-icon" />
                  {overviewGamesSectionTitle(data.upcomingSlate.hasLiveCrews)}
                </h2>
                <p className="overview-section-lead">
                  {data.upcomingSlate.hasLiveCrews
                    ? `${formatCount(data.upcomingSlate.totalGames)} games with published crews across live leagues.`
                    : data.upcomingSlate.inSeason
                      ? `${formatCount(data.upcomingSlate.totalScheduled)} upcoming matchup${data.upcomingSlate.totalScheduled === 1 ? "" : "s"}; crews not published yet.`
                      : "Live leagues are in offseason. Historical matrices, rankings, and ref profiles stay available."}
                </p>
              </div>

              {data.upcomingSlate.inSeason ? (
                <>
                  {data.upcomingSlate.leagueNotes.length > 0 ? (
                    <ul className="overview-slate-notes">
                      {data.upcomingSlate.leagueNotes.map((entry) => (
                        <li key={entry.leagueId} className="overview-slate-note" data-league={entry.leagueId}>
                          <span className="overview-slate-league-badge">{entry.leagueShortLabel}</span>
                          {entry.note}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ul className="overview-slate-list">
                    {data.upcomingSlate.games.map((game) => (
                      <OverviewSlateRow key={`${game.leagueId}-${game.gameId}`} game={game} />
                    ))}
                  </ul>
                  {data.upcomingSlate.lastUpdated ? (
                    <p className="overview-slate-updated">
                      Assignments last checked{" "}
                      {new Date(data.upcomingSlate.lastUpdated).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="overview-slate-offseason">
                  <div className="overview-slate-offseason-grid">
                    {activeLiveLeagueIds()
                      .filter((leagueId) => leagueCardById.has(leagueId))
                      .map((leagueId) => {
                        const card = leagueCardById.get(leagueId);
                        const league = LEAGUES[leagueId];
                        if (!card) return null;
                        return (
                          <Link
                            key={leagueId}
                            href={card.href}
                            className="overview-slate-offseason-card rw-focus-ring"
                            data-league={leagueId}
                          >
                            <span className="overview-slate-offseason-label">{league.shortLabel}</span>
                            <span className="overview-slate-offseason-meta">
                              {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                  {data.upcomingSlate.lastUpdated ? (
                    <p className="overview-slate-updated">
                      Assignments last checked{" "}
                      {new Date(data.upcomingSlate.lastUpdated).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                </div>
              )}
            </section>

            <section className="overview-research-hub section-block" aria-labelledby="overview-research-hub-heading">
              <div className="overview-section-header">
                <h2 className="overview-section-title" id="overview-research-hub-heading">
                  Research hub
                </h2>
                <p className="overview-section-lead">
                  Exploratory analytics distinct from live league insights — starting with
                  2026 World Cup officiating origin variance.
                </p>
              </div>
              <WorldCupResearchHubCard />
            </section>

            <DashboardSection
              className="overview-pace overview-pace--scorecard"
              title="Comparative scorecard"
              titleId="overview-pace-heading"
              lead="Cross-league whistle and scoring pace at a glance: typography-first, with minimalist trend lines."
            >
              <OverviewComparativeScorecard cards={data.leagueCards} />
            </DashboardSection>

            <DashboardSection
              className="overview-expansion"
              title="Expanding coverage"
              titleId="overview-expansion-heading"
              lead="More soccer leagues roll out on the roadmap. Live hubs above stay unchanged."
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
