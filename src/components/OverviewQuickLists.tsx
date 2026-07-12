"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  overviewQuickListsForLeague,
  type OverviewQuickList,
} from "@/lib/league-catalog";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

type OverviewQuickListsProps = {
  defaultLeagueId?: LeagueId;
};

export function OverviewQuickLists({
  defaultLeagueId = "nba",
}: OverviewQuickListsProps) {
  const [activeLeague, setActiveLeague] = useState<LeagueId>(defaultLeagueId);
  const lists: OverviewQuickList[] = overviewQuickListsForLeague(activeLeague);
  const league = LEAGUES[activeLeague];

  return (
    <section className="overview-quicklists" aria-label="League quick lists">
      <p className="overview-quicklists-step" id="overview-quicklists-step">
        <span className="overview-quicklists-step-label">Step 1</span>
        Choose league
      </p>
      <div
        className="overview-quicklists-tabs"
        role="tablist"
        aria-labelledby="overview-quicklists-step"
      >
        {VERIFIED_LIVE_LEAGUE_IDS.map((leagueId) => {
          const meta = LEAGUES[leagueId];
          const selected = leagueId === activeLeague;
          return (
            <button
              key={leagueId}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`overview-quicklists-tab${selected ? " overview-quicklists-tab--active" : ""}`}
              data-league={leagueId}
              onClick={() => setActiveLeague(leagueId)}
            >
              {meta.shortLabel}
            </button>
          );
        })}
      </div>

      <p className="overview-quicklists-step">
        <span className="overview-quicklists-step-label">Step 2</span>
        Open a {league.shortLabel} view
      </p>
      <nav
        className="overview-quick-lists"
        aria-label={`${league.shortLabel} quick lists`}
        role="tabpanel"
      >
        {lists.map((list) => (
          <Link
            key={`${activeLeague}-${list.id}`}
            href={list.href}
            className={`overview-quick-list overview-quick-list--${list.accent}`}
          >
            <span className="overview-quick-list-copy">
              <span className="overview-quick-list-label">{list.label}</span>
              <span className="overview-quick-list-desc">{list.description}</span>
            </span>
            <ArrowRight className="overview-quick-list-arrow" aria-hidden />
          </Link>
        ))}
      </nav>
    </section>
  );
}
