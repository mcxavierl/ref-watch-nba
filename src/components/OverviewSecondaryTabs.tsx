"use client";

import { useState } from "react";
import { OverviewComparativeScorecard } from "@/components/OverviewComparativeScorecard";
import { OverviewQuickLists } from "@/components/OverviewQuickLists";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { overviewGamesSectionTitle } from "@/lib/leagues";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { LEAGUES } from "@/lib/leagues";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

type TabId = "slate" | "pace" | "lists";

type OverviewSecondaryTabsProps = {
  data: CrossLeagueOverview;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function OverviewSecondaryTabs({ data }: OverviewSecondaryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("slate");
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));

  const tabs: { id: TabId; label: string }[] = [
    { id: "slate", label: "Upcoming" },
    { id: "pace", label: "Pace scorecard" },
    { id: "lists", label: "Quick lists" },
  ];

  return (
    <section
      className="overview-secondary-tabs section-block overview-section--secondary"
      aria-labelledby="overview-secondary-tabs-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <h2 className="overview-section-title" id="overview-secondary-tabs-heading">
          More from the dashboard
        </h2>
        <p className="overview-section-lead">
          Schedules, cross-league pace, and ranked shortcuts — open when you need them.
        </p>
      </div>

      <div className="overview-secondary-tabs-bar" role="tablist" aria-label="Dashboard sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`overview-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`overview-tabpanel-${tab.id}`}
            className={`overview-secondary-tab${activeTab === tab.id ? " overview-secondary-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="overview-tabpanel-slate"
        role="tabpanel"
        aria-labelledby="overview-tab-slate"
        hidden={activeTab !== "slate"}
        className="overview-secondary-tabpanel"
      >
        <div className="overview-section-header overview-section-header--nested">
          <h3 className="overview-secondary-panel-title">
            <CalendarDays aria-hidden className="overview-slate-icon" />
            {overviewGamesSectionTitle(data.upcomingSlate.hasLiveCrews)}
          </h3>
          <p className="overview-section-lead">
            {data.upcomingSlate.hasLiveCrews
              ? `${formatCount(data.upcomingSlate.totalGames)} games with published crews.`
              : data.upcomingSlate.inSeason
                ? `${formatCount(data.upcomingSlate.totalScheduled)} upcoming matchup${data.upcomingSlate.totalScheduled === 1 ? "" : "s"}.`
                : "Offseason — historical data stays available in each hub."}
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
      </div>

      <div
        id="overview-tabpanel-pace"
        role="tabpanel"
        aria-labelledby="overview-tab-pace"
        hidden={activeTab !== "pace"}
        className="overview-secondary-tabpanel"
      >
        <OverviewComparativeScorecard cards={data.leagueCards} />
      </div>

      <div
        id="overview-tabpanel-lists"
        role="tabpanel"
        aria-labelledby="overview-tab-lists"
        hidden={activeTab !== "lists"}
        className="overview-secondary-tabpanel"
      >
        <OverviewQuickLists
          leagueCards={data.leagueCards}
          insightCards={data.insightCards}
        />
      </div>
    </section>
  );
}
