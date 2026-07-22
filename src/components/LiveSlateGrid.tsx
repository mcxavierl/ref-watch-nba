"use client";

import { RefreshCw } from "lucide-react";
import { OverviewSlateGamesInteractive } from "@/components/OverviewSlateGamesInteractive";
import type { LeagueId } from "@/lib/leagues";
import type { LiveSlateResult } from "@/lib/live-slate-engine";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { useLiveSlate } from "@/lib/use-live-slate";
import "@/components/overview-slate-shared.css";

type LiveSlateGridProps = {
  initialSlate?: LiveSlateResult;
  initialGames?: OverviewSlateEntry[];
  leagueId?: LeagueId;
  limit?: number;
  matchupLabel?: string;
  emptyMessage?: string;
  showHubLink?: boolean;
  variant?: "row" | "card";
  /** When false, render server games and score polling only (avoids SWR router conflicts on league hubs). */
  enableSlatePolling?: boolean;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function LiveSlateGrid({
  initialSlate,
  initialGames,
  leagueId,
  limit,
  matchupLabel = "matchup",
  emptyMessage = "No published matchups yet. Check back closer to tip-off.",
  showHubLink = true,
  variant = "card",
  enableSlatePolling = true,
}: LiveSlateGridProps) {
  const { games, slate, isValidating, refresh } = useLiveSlate({
    leagueId,
    limit,
    initialData: initialSlate,
    initialGames,
    enabled: enableSlatePolling,
  });

  const displayGames = games;
  const liveCount = slate?.totalGames ?? 0;
  const scheduledCount = slate?.totalScheduled ?? 0;
  const matchupCount = liveCount + scheduledCount;

  return (
    <>
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

      {displayGames.length > 0 ? (
        <div
          className={
            variant === "card"
              ? "upcoming-games-grid upcoming-games-grid--homepage grid grid-cols-1 md:grid-cols-3 gap-4"
              : "upcoming-games-grid upcoming-games-grid--hub"
          }
        >
          <OverviewSlateGamesInteractive
            games={displayGames}
            showHubLink={showHubLink}
            variant={variant}
            liveData={enableSlatePolling && Boolean(slate)}
            disableScorePolling={!enableSlatePolling}
          />
        </div>
      ) : (
        <p className="overview-slate-empty overview-slate-empty-panel">{emptyMessage}</p>
      )}
    </>
  );
}
