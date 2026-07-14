import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { LeagueChooser } from "@/components/LeagueChooser";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { OverviewQuickLists } from "@/components/OverviewQuickLists";
import { DashboardHeroHighlights } from "@/components/dashboard/DashboardHeroHighlights";
import {
  DashboardBodyLayout,
  DashboardHeroSection,
  DashboardSection,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";
import { OverviewInsightCard } from "@/components/OverviewInsightCard";
import {
  catalogBySport,
  catalogCompetitionCount,
  catalogStatusLabel,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { OverviewLeaguePaceGrid } from "@/components/OverviewLeaguePaceGrid";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, overviewGamesSectionTitle } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-upcoming-slate";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function CatalogLeagueRow({ entry }: { entry: CatalogLeagueEntry }) {
  const inner = (
    <>
      <span className="overview-catalog-name">{entry.label}</span>
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
        className="overview-catalog-row overview-catalog-row--link"
      >
        {inner}
      </Link>
    );
  }

  return <div className="overview-catalog-row overview-catalog-row--static">{inner}</div>;
}

function SlateRow({ game }: { game: OverviewSlateEntry }) {
  const dateLabel = game.slateDate
    ? new Date(`${game.slateDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <li className="overview-slate-row" data-league={game.leagueId} data-status={game.status}>
      <div className="overview-slate-row-main">
        <span className="overview-slate-league-badge">{game.leagueShortLabel}</span>
        <span className="overview-slate-matchup">{game.matchup}</span>
        {game.status === "scheduled" && dateLabel ? (
          <span className="overview-slate-date">{dateLabel}</span>
        ) : null}
      </div>
      <p className="overview-slate-crew">
        {game.status === "scheduled" ? (
          "Crews TBD"
        ) : game.headRef ? (
          <>
            Head ref <strong>{game.headRef}</strong>
            {game.crewCount > 1 ? ` · ${game.crewCount}-person crew` : null}
          </>
        ) : (
          `${game.crewCount}-person crew`
        )}
      </p>
      <Link href={game.href} className="overview-slate-row-link">
        Open {game.leagueShortLabel} hub
      </Link>
    </li>
  );
}

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
};

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const sportGroups = catalogBySport();
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));

  return (
    <DashboardShell>
      <DashboardHeroSection
        eyebrow="Multi-league overview"
        title="Referee analytics across all leagues."
        titleId="overview-hero-heading"
        lead="Actionable ref×team edges, over/under splits, and whistle outliers — ranked by sample depth and effect size across every live league."
        highlights={<DashboardHeroHighlights />}
      />

      <LeagueChooser cards={data.leagueCards} />

      <DashboardBodyLayout
        sidebar={
          <>
            <details className="overview-sidebar-block overview-catalog-collapsible" open>
              <summary className="overview-sidebar-heading overview-catalog-summary">
                <span className="overview-catalog-summary-copy">
                  <span className="overview-catalog-summary-title">League coverage</span>
                  <span className="overview-catalog-summary-hint">Live hubs and expansion roadmap</span>
                </span>
                <span className="overview-sidebar-count" aria-label={`${catalogCompetitionCount()} leagues tracked`}>
                  {catalogCompetitionCount()}
                </span>
              </summary>
              <p className="overview-catalog-lead">
                Every league on Ref Watch. Open a live hub or see what&apos;s coming next.
              </p>
              <div className="overview-catalog-groups">
                {sportGroups.map((group) => (
                  <div key={group.sport} className="overview-catalog-group">
                    <h3 className="overview-catalog-group-label">{group.label}</h3>
                    <div className="overview-catalog-list">
                      {group.entries.map((entry) => (
                        <CatalogLeagueRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <section className="overview-sidebar-block overview-sidebar-block--lists">
              <h2 className="overview-sidebar-heading overview-sidebar-heading--static">Quick lists</h2>
              <p className="overview-sidebar-note">
                Pick a league, select a list, then open the view, or click the same list
                again to jump straight in.
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
                  Rankings, tendencies, and matrix edges, scoped to each live league.
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
                      : "All four leagues are in offseason. Historical matrices, rankings, and ref profiles stay live."}
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
                      <SlateRow key={`${game.leagueId}-${game.gameId}`} game={game} />
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
                    {VERIFIED_LIVE_LEAGUE_IDS.map((leagueId) => {
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

            <DashboardSection
              className="overview-insights"
              title="Four leagues, four stories"
              titleId="overview-insights-heading"
              lead="The biggest ref×team edges and outlier patterns in each live league right now."
            >
              <div className="overview-insight-grid">
                {data.insightCards.map((card, index) => (
                  <OverviewInsightCard key={card.leagueId} card={card} index={index} />
                ))}
              </div>
            </DashboardSection>

            <DashboardSection
              className="overview-pace"
              title="League pace"
              titleId="overview-pace-heading"
              lead="Whistle and scoring environment by league, normalized for cross-sport comparison."
            >
              <OverviewLeaguePaceGrid cards={data.leagueCards} />
            </DashboardSection>

            <DashboardSection
              className="overview-expansion"
              title="Expanding coverage"
              titleId="overview-expansion-heading"
              lead="More soccer leagues and college sports are on the way. NBA, NHL, NFL, and Premier League pages stay live with no changes."
            >
              <div className="overview-expansion-grid">
                {VERIFIED_LIVE_LEAGUE_IDS.map((id) => (
                  <Link key={id} href={leagueHubHref(id)} className="overview-expansion-live rw-focus-ring">
                    <span className="overview-expansion-live-label">{LEAGUES[id].label}</span>
                    <LeagueSeasonStartBadge leagueId={id} />
                  </Link>
                ))}
                {sportGroups
                  .flatMap((g) => g.entries)
                  .filter((e) => e.status === "coming-soon")
                  .slice(0, 8)
                  .map((entry) => (
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
