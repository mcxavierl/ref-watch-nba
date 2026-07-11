import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { OverviewQuickLists } from "@/components/OverviewQuickLists";
import { SlateQuickLookup } from "@/components/SlateQuickLookup";
import {
  catalogBySport,
  catalogCompetitionCount,
  liveCatalogCount,
  type CatalogLeagueEntry,
} from "@/lib/league-catalog";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-upcoming-slate";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function formatPace(value: number, leagueId: LeagueId): string {
  if (leagueId === "epl") return value.toFixed(1);
  if (leagueId === "nhl") return value.toFixed(1);
  return value.toFixed(1);
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

function toneClass(tone: LeagueInsightTone): string {
  if (tone === "positive") return "overview-insight-hero--positive";
  if (tone === "negative") return "overview-insight-hero--negative";
  return "overview-insight-hero--neutral";
}

function InsightCard({ card, index }: { card: LeagueInsightCard; index: number }) {
  const leagueMeta = LEAGUES[card.leagueId];

  return (
    <article
      className="overview-insight-card"
      data-league={card.leagueId}
      style={{ "--insight-index": index } as CSSProperties}
    >
      <header className="overview-insight-card-head">
        <div className="overview-insight-league">
          <span className="overview-insight-league-mark" aria-hidden />
          <span className="overview-insight-league-label">{card.shortLabel}</span>
        </div>
        <p className="overview-insight-kicker">{card.kicker}</p>
      </header>

      <div className={`overview-insight-hero ${toneClass(card.heroTone)}`}>
        <span className="overview-insight-hero-value">{card.heroValue}</span>
        <span className="overview-insight-hero-label">{card.heroLabel}</span>
      </div>

      <div className="overview-insight-body">
        <h3 className="overview-insight-headline">
          {card.entityHref && card.entityName ? (
            <>
              <Link href={card.entityHref}>{card.entityName}</Link>
              {card.teamLabel ? (
                <>
                  {" "}
                  <span className="overview-insight-team">× {card.teamLabel}</span>
                </>
              ) : null}
            </>
          ) : (
            card.headline
          )}
        </h3>
        <p className="overview-insight-story">{card.story}</p>
      </div>

      {card.stats.length > 0 ? (
        <dl className="overview-insight-stats">
          {card.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <footer className="overview-insight-footer">
        {card.links.map((link, linkIndex) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              linkIndex === 0
                ? "overview-insight-link overview-insight-link--primary"
                : "overview-insight-link"
            }
          >
            {link.label}
            {linkIndex === 0 ? <ArrowRight aria-hidden /> : null}
          </Link>
        ))}
      </footer>

      <Link
        href={leagueMeta.pathPrefix || "/"}
        className="overview-insight-card-cover"
        aria-label={`Open ${card.label} hub`}
      />
    </article>
  );
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

function sampleRefsPerLeague(
  allRefs: CrossLeagueOverview["allRefs"],
): CrossLeagueOverview["allRefs"] {
  const seen = new Set<LeagueId>();
  const picks: CrossLeagueOverview["allRefs"] = [];
  for (const ref of allRefs) {
    if (seen.has(ref.leagueId)) continue;
    seen.add(ref.leagueId);
    picks.push(ref);
    if (seen.size === VERIFIED_LIVE_LEAGUE_IDS.length) break;
  }
  return picks;
}

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
};

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const sportGroups = catalogBySport();
  const lookupRefs = data.allRefs.slice(0, 400).map((ref) => ({
    slug: ref.slug,
    name: ref.name,
    games: ref.games,
    href: ref.href,
    leagueLabel: ref.leagueLabel,
  }));
  const sampleRefs = sampleRefsPerLeague(data.allRefs);
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));

  return (
    <div className="overview-page">
      <section className="overview-hero section-block" aria-labelledby="overview-hero-heading">
        <div className="overview-hero-copy">
          <p className="overview-eyebrow">Multi-league overview</p>
          <h1 className="overview-title" id="overview-hero-heading">
            Referee analytics across all leagues.
          </h1>
          <p className="overview-lead">
            One standout story per live league — ref×team edges, whistle outliers, and crew patterns
            from {formatCount(data.totalGames)} indexed games and {formatCount(data.totalRefs)}{" "}
            officials. {catalogCompetitionCount()} competitions on the roadmap.
          </p>
        </div>

        <div className="overview-hero-search">
          <SlateQuickLookup
            refs={lookupRefs}
            sampleRefSlugs={sampleRefs.map((r) => r.slug)}
            heading="Search officials"
            lead="Find any ref across NBA, NHL, NFL, EPL, and La Liga — results show league badges."
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
            <span className="overview-stat-value">{formatCount(liveCatalogCount())}</span>
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
          <details className="overview-sidebar-block overview-catalog-collapsible">
            <summary className="overview-sidebar-heading overview-catalog-summary">
              Competitions
              <span className="overview-sidebar-count">{catalogCompetitionCount()}</span>
            </summary>
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
            <h2 className="overview-sidebar-heading">Lists</h2>
            <OverviewQuickLists />
          </section>
        </aside>

        <div className="overview-main">
          <section className="overview-quicklists-mobile section-block">
            <div className="overview-section-header">
              <h2 className="overview-section-title">Quick lists</h2>
              <p className="overview-section-lead">
                Rankings, tendencies, and matrix edges — scoped to each live league.
              </p>
            </div>
            <OverviewQuickLists />
          </section>

          <section className="overview-slate section-block" aria-labelledby="overview-slate-heading">
            <div className="overview-section-header">
              <h2 className="overview-section-title" id="overview-slate-heading">
                <CalendarDays aria-hidden className="overview-slate-icon" />
                {data.upcomingSlate.hasLiveCrews ? "Tonight's slate" : "Next slate"}
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
                    Assignments last checked {new Date(data.upcomingSlate.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                        className="overview-slate-offseason-card"
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
                    Assignments last checked {new Date(data.upcomingSlate.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <section className="overview-insights section-block" aria-labelledby="overview-insights-heading">
            <div className="overview-section-header">
              <h2 className="overview-section-title" id="overview-insights-heading">
                Four leagues, four stories
              </h2>
              <p className="overview-section-lead">
                The biggest ref×team edges and outlier patterns in each live league right now.
              </p>
            </div>

            <div className="overview-insight-grid">
              {data.insightCards.map((card, index) => (
                <InsightCard key={card.leagueId} card={card} index={index} />
              ))}
            </div>
          </section>

          <section
            className="overview-pace section-block"
            aria-labelledby="overview-pace-heading"
          >
            <div className="overview-section-header">
              <h2 className="overview-section-title" id="overview-pace-heading">
                League pace
              </h2>
              <p className="overview-section-lead">
                Whistle and scoring environment by league — normalized for cross-sport comparison.
              </p>
            </div>

            <div className="overview-pace-grid">
              {data.leagueCards.map((card) => (
                <Link
                  key={card.leagueId}
                  href={card.href}
                  className="overview-pace-card"
                  data-league={card.leagueId}
                >
                  <div className="overview-pace-card-head">
                    <span className="overview-pace-label">{card.shortLabel}</span>
                    <span className="overview-pace-meta">
                      {formatCount(card.refCount)} refs · {card.seasonCount} seasons
                    </span>
                  </div>

                  <div className="overview-pace-metric">
                    <div className="overview-pace-metric-head">
                      <span>{card.whistleLabel}</span>
                      <strong>{formatPace(card.whistlePerGame, card.leagueId)}</strong>
                    </div>
                    <div className="overview-pace-bar" aria-hidden>
                      <span
                        className="overview-pace-bar-fill overview-pace-bar-fill--whistle"
                        style={{ width: `${Math.round(card.whistleBar * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="overview-pace-metric">
                    <div className="overview-pace-metric-head">
                      <span>{card.scoreLabel}</span>
                      <strong>{formatPace(card.scorePerGame, card.leagueId)}</strong>
                    </div>
                    <div className="overview-pace-bar" aria-hidden>
                      <span
                        className="overview-pace-bar-fill overview-pace-bar-fill--score"
                        style={{ width: `${Math.round(card.scoreBar * 100)}%` }}
                      />
                    </div>
                  </div>

                  <span className="overview-pace-cta">
                    Open hub <ArrowRight aria-hidden />
                  </span>
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
                More soccer leagues and college sports are on the way. NBA, NHL, NFL, and Premier
                League pages stay live with no changes.
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
