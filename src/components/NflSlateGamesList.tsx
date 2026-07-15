"use client";

import { useMemo, useState } from "react";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
import type { OverviewSlateEntry } from "@/lib/overview-upcoming-slate";

const NFL_SLATE_PREVIEW_COUNT = 5;

type NflSlateGamesListProps = {
  games: OverviewSlateEntry[];
};

export function NflSlateGamesList({ games }: NflSlateGamesListProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleGames = useMemo(
    () => (expanded ? games : games.slice(0, NFL_SLATE_PREVIEW_COUNT)),
    [expanded, games],
  );

  const hiddenCount = Math.max(0, games.length - NFL_SLATE_PREVIEW_COUNT);

  if (games.length === 0) return null;

  return (
    <>
      {visibleGames.map((game) => (
        <OverviewSlateRow key={`${game.leagueId}-${game.gameId}`} game={game} />
      ))}
      {hiddenCount > 0 ? (
        <li className="overview-slate-view-more">
          <button
            type="button"
            className="overview-slate-view-more-btn rw-focus-ring"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Show fewer NFL games"
              : `View ${hiddenCount} more NFL game${hiddenCount === 1 ? "" : "s"}`}
          </button>
        </li>
      ) : null}
    </>
  );
}
