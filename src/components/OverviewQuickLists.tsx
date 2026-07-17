"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import {
  overviewQuickListsForLeague,
  type OverviewQuickList,
} from "@/lib/league-quick-lists";
import { CBB_TEAMS } from "@/lib/cbb/teams";
import { KpiDataPill } from "@/components/ui/KpiDataPill";
import { OVERVIEW_HUB_LEAGUE_IDS } from "@/lib/verified-live-leagues";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

const DEFAULT_LIST_ID = "whistle-leaders";

type OverviewQuickListsProps = {
  defaultLeagueId?: LeagueId;
  leagueCards: LeagueOverviewCard[];
  insightCards: LeagueInsightCard[];
};

export function OverviewQuickLists({
  defaultLeagueId = "nba",
  leagueCards,
  insightCards,
}: OverviewQuickListsProps) {
  const router = useRouter();
  const [activeLeague, setActiveLeague] = useState<LeagueId>(defaultLeagueId);
  const [selectedListId, setSelectedListId] = useState<string>(DEFAULT_LIST_ID);
  const [teamFilter, setTeamFilter] = useState("all");

  const leagueCard = leagueCards.find((card) => card.leagueId === activeLeague);
  const insightCard = insightCards.find((card) => card.leagueId === activeLeague);
  const lists = overviewQuickListsForLeague(activeLeague, {
    leagueCard,
    insightCard,
  });
  const league = LEAGUES[activeLeague];
  const selectedList = lists.find((list) => list.id === selectedListId) ?? lists[0];
  const teamFilterOptions = useMemo(() => {
    if (activeLeague !== "cbb") {
      return [{ value: "all", label: "All Teams" }];
    }
    return [
      { value: "all", label: "All Teams" },
      ...CBB_TEAMS.map((team) => ({
        value: team.abbr,
        label: `${team.city} ${team.name}`,
      })),
    ];
  }, [activeLeague]);

  useEffect(() => {
    setSelectedListId(DEFAULT_LIST_ID);
    setTeamFilter("all");
  }, [activeLeague]);

  const handleListSelect = (list: OverviewQuickList) => {
    if (selectedListId === list.id) {
      router.push(list.href);
      return;
    }
    setSelectedListId(list.id);
  };

  return (
    <section
      className="overview-quicklists"
      data-league={activeLeague}
      aria-label="League quick lists"
    >
      <p className="overview-quicklists-step" id="overview-quicklists-step">
        <span className="overview-quicklists-step-label">Step 1</span>
        Choose league
      </p>
      <div
        className="overview-quicklists-segmented"
        role="tablist"
        aria-labelledby="overview-quicklists-step"
      >
        {OVERVIEW_HUB_LEAGUE_IDS.map((leagueId) => {
          const meta = LEAGUES[leagueId];
          const selected = leagueId === activeLeague;
          return (
            <button
              key={leagueId}
              type="button"
              role="tab"
              aria-selected={selected}
              className="overview-quicklists-segment"
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
        Select {league.shortLabel} list
      </p>
      <div
        className="overview-quick-lists"
        data-league={activeLeague}
        aria-label={`${league.shortLabel} quick lists`}
        role="tabpanel"
      >
        {lists.map((list) => {
          const selected = list.id === selectedListId;

          return (
            <button
              key={`${activeLeague}-${list.id}`}
              type="button"
              aria-pressed={selected}
              className={`overview-quick-list overview-quick-list--${list.accent}`}
              onClick={() => handleListSelect(list)}
            >
              <span className="overview-quick-list-copy min-w-0 flex-1">
                <span className="overview-quick-list-label block">{list.label}</span>
                <span className="overview-quick-list-desc block">{list.description}</span>
              </span>
              <KpiDataPill
                variant="compact"
                value={list.preview.value}
                caption={list.preview.caption}
                accent={list.accent}
                className="overview-quick-list-preview"
              />
            </button>
          );
        })}
      </div>

      {selectedList ? (
        <div className="overview-quicklists-open-row">
          <div className="overview-quicklists-context">
            <p className="overview-quicklists-context-line overview-quicklists-context-line--primary">
              {selectedList.label} selected for {league.shortLabel} ({league.label}).
            </p>
            <p className="overview-quicklists-context-refine">
              <span className="overview-quicklists-context-refine-label">Refine by Team:</span>
              <select
                className="overview-quicklists-team-filter"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                aria-label={`Filter ${selectedList.label} by team`}
              >
                {teamFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </p>
          </div>
          <Link
            href={selectedList.href}
            className="overview-quicklists-open-btn"
            aria-label={`Open ${selectedList.label} for ${league.shortLabel}`}
          >
            Open {selectedList.label}
            <ArrowRight className="overview-quick-list-arrow" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
