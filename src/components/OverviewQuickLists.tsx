"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import {
  overviewQuickListsForLeague,
  type OverviewQuickList,
} from "@/lib/league-catalog";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

const PREVIEW_ACCENT_CLASS: Record<OverviewQuickList["accent"], string> = {
  amber: "text-amber-400",
  rose: "text-rose-400",
  sky: "text-sky-400",
  emerald: "text-emerald-400",
};

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

  const leagueCard = leagueCards.find((card) => card.leagueId === activeLeague);
  const insightCard = insightCards.find((card) => card.leagueId === activeLeague);
  const lists = overviewQuickListsForLeague(activeLeague, {
    leagueCard,
    insightCard,
  });
  const league = LEAGUES[activeLeague];
  const selectedList = lists.find((list) => list.id === selectedListId) ?? lists[0];

  useEffect(() => {
    setSelectedListId(DEFAULT_LIST_ID);
  }, [activeLeague]);

  const handleListSelect = (list: OverviewQuickList) => {
    if (selectedListId === list.id) {
      router.push(list.href);
      return;
    }
    setSelectedListId(list.id);
  };

  return (
    <section className="overview-quicklists" aria-label="League quick lists">
      <p className="overview-quicklists-step" id="overview-quicklists-step">
        <span className="overview-quicklists-step-label">Step 1</span>
        Choose league
      </p>
      <div
        className="overview-quicklists-segmented grid grid-cols-5 gap-1 rounded-lg border border-zinc-800/40 bg-zinc-900/60 p-1"
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
              className={`overview-quicklists-segment rounded-md px-1 py-1.5 text-center text-[0.68rem] font-bold uppercase tracking-wide transition ${
                selected
                  ? "border border-zinc-700/50 bg-zinc-800 text-white shadow-sm"
                  : "border border-transparent text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
              }`}
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
        Select a {league.shortLabel} list
      </p>
      <div
        className="overview-quick-lists"
        aria-label={`${league.shortLabel} quick lists`}
        role="tabpanel"
      >
        {lists.map((list) => {
          const selected = list.id === selectedListId;
          const previewClass = PREVIEW_ACCENT_CLASS[list.accent];

          return (
            <button
              key={`${activeLeague}-${list.id}`}
              type="button"
              aria-pressed={selected}
              className={`overview-quick-list overview-quick-list--${list.accent} flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-zinc-700 bg-zinc-900 shadow-md ring-1 ring-zinc-800"
                  : "border-zinc-900 bg-zinc-900/20 hover:border-zinc-800 hover:bg-zinc-900/35"
              }`}
              onClick={() => handleListSelect(list)}
            >
              <span className="overview-quick-list-copy min-w-0 flex-1">
                <span className="overview-quick-list-label block">{list.label}</span>
                <span className="overview-quick-list-desc block">{list.description}</span>
              </span>
              <span
                className={`overview-quick-list-preview shrink-0 text-right font-mono text-xs leading-tight ${previewClass}`}
              >
                <span className="block font-semibold tabular-nums">{list.preview.value}</span>
                <span className="mt-0.5 block text-[0.62rem] font-medium uppercase tracking-wide opacity-80">
                  {list.preview.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedList ? (
        <div className="overview-quicklists-open-row">
          <p className="overview-quicklists-open-hint">
            {selectedList.label} selected — open the live {league.shortLabel} view.
          </p>
          <Link
            href={selectedList.href}
            className="overview-quicklists-open-btn"
          >
            Open view
            <ArrowRight className="overview-quick-list-arrow" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
