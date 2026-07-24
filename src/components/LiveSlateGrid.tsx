"use client";

import { RefreshCw } from "lucide-react";
import { TodaysOfficiatingOutlookBanner } from "@/components/TodaysOfficiatingOutlookBanner";
import { OverviewSlateGamesInteractive } from "@/components/OverviewSlateGamesInteractive";
import type { LeagueId } from "@/lib/leagues";
import type { LiveSlateResult } from "@/lib/live-slate-engine";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  partitionHomepageSlateGames,
  sortSlateGamesBySignal,
} from "@/lib/slate-intelligence";
import { useLiveSlate } from "@/lib/use-live-slate";
import "@/components/overview-slate-shared.css";
import "@/components/slate-intelligence.css";

type LiveSlateGridProps = {
  initialSlate?: LiveSlateResult;
  initialGames?: OverviewSlateEntry[];
  /** Snapshot-backed matchup context preserved across live slate polls. */
  historicalSeedGames?: OverviewSlateEntry[];
  leagueId?: LeagueId;
  limit?: number;
  matchupLabel?: string;
  emptyMessage?: string;
  showHubLink?: boolean;
  variant?: "row" | "card";
  /** When false, render server games and score polling only (avoids SWR router conflicts on league hubs). */
  enableSlatePolling?: boolean;
  /** Homepage intelligence outlook banner above the grid. */
  showOutlookBanner?: boolean;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function LiveSlateGrid({
  initialSlate,
  initialGames,
  historicalSeedGames,
  leagueId,
  limit,
  matchupLabel = "matchup",
  emptyMessage = "No published matchups yet. Check back closer to tip-off.",
  showHubLink = true,
  variant = "card",
  enableSlatePolling = true,
  showOutlookBanner = false,
}: LiveSlateGridProps) {
  const { games, slate, isValidating, refresh } = useLiveSlate({
    leagueId,
    limit,
    initialData: initialSlate,
    initialGames,
    historicalSeedGames,
    enabled: enableSlatePolling,
  });

  const sortedGames = sortSlateGamesBySignal(games);
  const { primaryGames, pendingGames } = showOutlookBanner
    ? partitionHomepageSlateGames(sortedGames)
    : { primaryGames: sortedGames, pendingGames: [] as OverviewSlateEntry[] };
  const matchupCount = sortedGames.length;

  return (
    <>
      {showOutlookBanner ? <TodaysOfficiatingOutlookBanner games={sortedGames} /> : null}
      {!showOutlookBanner ? (
        <div className="live-slate-toolbar">
          <p className="live-slate-counter">
            {matchupCount > 0
              ? `${formatCount(matchupCount)} ${matchupLabel}${matchupCount === 1 ? "" : "s"} on the slate`
              : "Slate updates as assignments publish"}
          </p>
          <div className="live-slate-controls">
            {enableSlatePolling ? (
              <button
                type="button"
                className="live-slate-refresh rw-focus-ring"
                onClick={() => void refresh()}
                disabled={isValidating}
                aria-label="Refresh live slate"
              >
                <RefreshCw
                  aria-hidden
                  className={isValidating ? "live-slate-refresh-icon--spin" : undefined}
                  size={14}
                />
                Refresh
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {sortedGames.length > 0 ? (
        <div className="overview-slate-grid-stack">
          <div
            className={
              variant === "card"
                ? "upcoming-games-grid upcoming-games-grid--homepage"
                : "upcoming-games-grid upcoming-games-grid--hub"
            }
          >
            <OverviewSlateGamesInteractive
              games={primaryGames}
              showHubLink={showHubLink}
              variant={variant}
              liveData={enableSlatePolling && Boolean(slate)}
              disableScorePolling={!enableSlatePolling}
            />
          </div>

          {showOutlookBanner && pendingGames.length > 0 ? (
            <div className="overview-slate-pending-section">
              <h3 className="overview-slate-pending-heading">Pending crew assignments</h3>
              <div
                className={
                  variant === "card"
                    ? "upcoming-games-grid upcoming-games-grid--homepage upcoming-games-grid--pending"
                    : "upcoming-games-grid upcoming-games-grid--hub upcoming-games-grid--pending"
                }
              >
                <OverviewSlateGamesInteractive
                  games={pendingGames}
                  showHubLink={showHubLink}
                  variant={variant}
                  liveData={enableSlatePolling && Boolean(slate)}
                  disableScorePolling={!enableSlatePolling}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="overview-slate-empty overview-slate-empty-panel">{emptyMessage}</p>
      )}
    </>
  );
}
