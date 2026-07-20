"use client";

import { useMemo, useState } from "react";
import { OverviewSlateGamesInteractive } from "@/components/OverviewSlateGamesInteractive";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

export const SLATE_PREVIEW_COUNT = 5;

type LeagueSlateGamesListProps = {
  games: OverviewSlateEntry[];
  leagueShortLabel: string;
  showHubLink?: boolean;
};

export function LeagueSlateGamesList({
  games,
  leagueShortLabel,
  showHubLink = true,
}: LeagueSlateGamesListProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleGames = useMemo(
    () => (expanded ? games : games.slice(0, SLATE_PREVIEW_COUNT)),
    [expanded, games],
  );

  const hiddenCount = Math.max(0, games.length - SLATE_PREVIEW_COUNT);

  if (games.length === 0) return null;

  return (
    <>
      <OverviewSlateGamesInteractive
        games={visibleGames}
        showHubLink={showHubLink}
        variant="row"
      />
      {hiddenCount > 0 ? (
        <li className="overview-slate-view-more">
          <button
            type="button"
            className="overview-slate-view-more-btn rw-focus-ring"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? `Show fewer ${leagueShortLabel} games`
              : `View ${hiddenCount} more ${leagueShortLabel} game${hiddenCount === 1 ? "" : "s"}`}
          </button>
        </li>
      ) : null}
    </>
  );
}
