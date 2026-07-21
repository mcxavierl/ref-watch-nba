import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { hasSlateScore } from "@/lib/slate-game-phase";

export function shouldShowSlateScore(game: OverviewSlateEntry): boolean {
  return hasSlateScore(game.gamePhase, game.awayScore, game.homeScore);
}

export function formatSlateScoreValue(score: number | undefined): string {
  return score === undefined ? "-" : String(score);
}

export function SlateScoreboard({
  game,
  className = "",
  compact = false,
}: {
  game: OverviewSlateEntry;
  className?: string;
  compact?: boolean;
}) {
  if (!shouldShowSlateScore(game)) return null;

  const live = game.gamePhase === "live" || game.status === "live";
  const final = game.gamePhase === "final" || game.status === "final";

  return (
    <div
      className={`slate-scoreboard${compact ? " slate-scoreboard--compact" : ""}${className ? ` ${className}` : ""}`}
      data-live={live ? "true" : "false"}
      data-final={final ? "true" : "false"}
      aria-label={`Score ${formatSlateScoreValue(game.awayScore)} to ${formatSlateScoreValue(game.homeScore)}`}
    >
      {live ? (
        <span className="slate-scoreboard__badge" aria-hidden>
          Live
        </span>
      ) : null}
      {final && !live ? (
        <span className="slate-scoreboard__badge slate-scoreboard__badge--final" aria-hidden>
          Final
        </span>
      ) : null}
      <span className="slate-scoreboard__score">{formatSlateScoreValue(game.awayScore)}</span>
      <span className="slate-scoreboard__dash" aria-hidden>
        -
      </span>
      <span className="slate-scoreboard__score">{formatSlateScoreValue(game.homeScore)}</span>
      {game.gameClock ? (
        <span className="slate-scoreboard__clock">{game.gameClock}</span>
      ) : null}
    </div>
  );
}
