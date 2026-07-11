import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { SlateQuickLookup } from "@/components/SlateQuickLookup";
import {
  catalogBySport,
  catalogCompetitionCount,
  liveCatalogCount,
  overviewQuickListsForLeague,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES } from "@/lib/leagues";
import { formatSigned } from "@/lib/stats-utils";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function formatRate(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function statusLabel(status: CatalogLeagueEntry["status"]): string {
  if (status === "live") return "Live";
  if (status === "preview") return "Preview";
  return "Soon";
}

function CatalogLeagueRow({ entry }: { entry: CatalogLeagueEntry }) {
  const inner = (
    <>
      <span className="overview-catalog-name">{entry.label}</span>
      <span className="overview-catalog-meta">
        <span className={`overview-catalog-status overview-catalog-status--${entry.status}`}>
          {statusLabel(entry.status)}
        </span>
        <span className="overview-catalog-region">{entry.region}</span>
      </span>
    </>
  );

  if (entry.href && entry.status !== "coming-soon") {
    return (
      <Link href={entry.href} className="overview-catalog-row overview-catalog-row--link">
        {inner}
      </Link>
    );
  }

  return <div className="overview-catalog-row overview-catalog-row--static">{inner}</div>;
}

function WhistleSparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="overview-sparkline overview-sparkline--empty" aria-hidden />;
  }
  const max = Math.max(...values, 1);
  return (
    <div className="overview-sparkline" aria-hidden>
      {values.map((value, index) => (
        <span
          key={index}
          className="overview-sparkline-bar"
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
};

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const sportGroups = catalogBySport();
  const quickLists = overviewQuickListsForLeague("nba");
  const lookupRefs = data.allRefs.slice(0, 400).map((ref) => ({
    slug: ref.slug,
    name: ref.name,
    games: ref.games,
    href: ref.href,
  }));

  return (
    <div className="overview-page">
      <section className="overview-hero section-block" aria-labelledby="overview-hero-heading">
        <div className="overview-hero-copy">
          <p className="overview-eyebrow">Multi-league overview</p>
          <h1 className="overview-title" id="overview-hero-heading">
            Every whistle, every crew, every edge.
          </h1>
          <p className="overview-lead">
            Referee analytics across {formatCount(data.liveLeagueCount)} live leagues,{" "}
            {formatCount(data.totalRefs)} officials, and {formatCount(data.totalGames)} indexed
            games. {catalogCompetitionCount()} competitions on the roadmap.
          </p>
        </div>

        <div className="overview-hero-search">
          <SlateQuickLookup
            refs={lookupRefs}
            sampleRefSlugs={lookupRefs.slice(0, 3).map((r) => r.slug)}
            heading="Search officials"
            lead="Find a ref profile across NBA, NHL, NFL, and EPL."
            placeholder="Search refs across live leagues…"
            includeTeams={false}
            includeShortcuts={false}
          />
        </div>

        <div className="overview-stats-row" aria-label="Dataset totals">
          <div className="overview-stat">
            <span className="overview-stat-label">Officials</span>
            <span className="overview-stat-value">{formatCount(data.totalRefs)}</span>
          </div>
          <div className="overview-stat">
            <span className="overview-stat-label">Live leagues</span>
            <span className="overview-stat-value">
              {formatCount(data.liveLeagueCount)}
              <span className="overview-stat-sub"> / {formatCount(liveCatalogCount())} active</span>
            </span>
          </div>
          <div className="overview-stat">
            <span className="overview-stat-label">Matches</span>
            <span className="overview-stat-value">{formatCount(data.totalGames)}</span>
          </div>
          <div className="overview-stat">
            <span className="overview-stat-label">{data.whistleLabel}</span>
            <span className="overview-stat-value">{formatCount(data.whistleEventsLogged)}</span>
          </div>
        </div>
      </section>

      <div className="overview-layout">
        <aside className="overview-sidebar" aria-label="Competitions and lists">
          <section className="overview-sidebar-block">
            <h2 className="overview-sidebar-heading">
              Competitions
              <span className="overview-sidebar-count">{catalogCompetitionCount()}</span>
            </h2>
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
          </section>

          <section className="overview-sidebar-block">
            <h2 className="overview-sidebar-heading">Lists</h2>
            <nav className="overview-quick-lists" aria-label="Quick lists">
              {quickLists.map((list) => (
                <Link
                  key={list.id}
                  href={list.href}
                  className={`overview-quick-list overview-quick-list--${list.accent}`}
                >
                  <span className="overview-quick-list-label">{list.label}</span>
                  <span className="overview-quick-list-desc">{list.description}</span>
                </Link>
              ))}
            </nav>
            <p className="overview-sidebar-note">
              Lists open the NBA hub. Switch leagues above for NHL, NFL, or EPL views.
            </p>
          </section>
        </aside>

        <div className="overview-main">
          {data.spotlight ? (
            <section className="overview-spotlight" aria-labelledby="overview-spotlight-heading">
              <div className="overview-spotlight-copy">
                <p className="overview-eyebrow">Top whistle rate</p>
                <h2 className="overview-section-title" id="overview-spotlight-heading">
                  <Link href={data.spotlight.href}>{data.spotlight.name}</Link>
                </h2>
                <p className="overview-spotlight-league">{data.spotlight.leagueLabel}</p>
                <dl className="overview-spotlight-stats">
                  <div>
                    <dt>Games</dt>
                    <dd>{formatCount(data.spotlight.games)}</dd>
                  </div>
                  <div>
                    <dt>{data.spotlight.whistleLabel}</dt>
                    <dd>{formatRate(data.spotlight.whistlePerGame)}</dd>
                  </div>
                  <div>
                    <dt>vs league</dt>
                    <dd>{formatSigned(data.spotlight.whistleDelta)}</dd>
                  </div>
                </dl>
                <Link href={data.spotlight.href} className="overview-inline-link">
                  View profile <ArrowRight aria-hidden />
                </Link>
              </div>
              <div className="overview-spotlight-chart">
                <p className="overview-spotlight-chart-label">Last {data.spotlight.recentWhistle.length} games</p>
                <WhistleSparkline values={data.spotlight.recentWhistle} />
              </div>
            </section>
          ) : null}

          <section className="overview-leagues section-block" aria-labelledby="overview-leagues-heading">
            <div className="overview-section-header">
              <h2 className="overview-section-title" id="overview-leagues-heading">
                Highest-whistle leagues
              </h2>
              <p className="overview-section-lead">
                Live leagues ranked by average whistle pace per game.
              </p>
            </div>

            <div className="overview-league-cards">
              {data.leagueCards.map((card, index) => (
                <Link
                  key={card.leagueId}
                  href={card.href}
                  className="overview-league-card"
                  style={{ "--league-rank": index + 1 } as CSSProperties}
                >
                  <div className="overview-league-card-head">
                    <span className="overview-league-rank">#{String(index + 1).padStart(2, "0")}</span>
                    <span className="overview-league-card-title">{card.label}</span>
                  </div>
                  <p className="overview-league-card-meta">
                    {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games ·{" "}
                    {card.seasonCount} seasons
                  </p>
                  <div className="overview-league-bars">
                    <div className="overview-league-bar-row">
                      <span className="overview-league-bar-label">{card.whistleLabel}</span>
                      <span className="overview-league-bar-value">{formatRate(card.whistlePerGame)}</span>
                      <span className="overview-league-bar-track" aria-hidden>
                        <span
                          className="overview-league-bar-fill overview-league-bar-fill--whistle"
                          style={{ width: `${card.whistleBar * 100}%` }}
                        />
                      </span>
                    </div>
                    <div className="overview-league-bar-row">
                      <span className="overview-league-bar-label">{card.scoreLabel}</span>
                      <span className="overview-league-bar-value">{formatRate(card.scorePerGame)}</span>
                      <span className="overview-league-bar-track" aria-hidden>
                        <span
                          className="overview-league-bar-fill overview-league-bar-fill--score"
                          style={{ width: `${card.scoreBar * 100}%` }}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="overview-expansion section-block" aria-labelledby="overview-expansion-heading">
            <div className="overview-section-header">
              <h2 className="overview-section-title" id="overview-expansion-heading">
                Expanding coverage
              </h2>
              <p className="overview-section-lead">
                Soccer competitions and college leagues join the catalog as ingest ships. Live NBA,
                NHL, NFL, and EPL routes stay unchanged.
              </p>
            </div>
            <div className="overview-expansion-grid">
              {VERIFIED_LIVE_LEAGUE_IDS.map((id) => (
                <Link key={id} href={LEAGUES[id].pathPrefix || "/"} className="overview-expansion-live">
                  <span className="overview-expansion-live-label">{LEAGUES[id].label}</span>
                  <span className="overview-expansion-live-status">Live</span>
                </Link>
              ))}
              {sportGroups
                .flatMap((g) => g.entries)
                .filter((e) => e.status === "coming-soon")
                .slice(0, 8)
                .map((entry) => (
                  <div key={entry.id} className="overview-expansion-soon">
                    <span className="overview-expansion-soon-label">{entry.label}</span>
                    <span className="overview-expansion-soon-region">{entry.region}</span>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
