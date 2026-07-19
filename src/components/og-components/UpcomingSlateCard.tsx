import { OgLeagueMark } from "@/components/og-components/og-league-mark";
import { leagueMatchupGlow } from "@/components/og-components/league-accent";
import type { OgUpcomingSlateCardData } from "@/components/og-components/types";
import { formatSlateDateLabel } from "@/lib/slate-team-display";

/** Upcoming slate match card for OG snapshots (matches overview upcoming-game-card styling). */
export function UpcomingSlateCard({ game }: { game: OgUpcomingSlateCardData }) {
  const dateLabel = formatSlateDateLabel(game.slateDate);
  const glow = leagueMatchupGlow(game.leagueId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {dateLabel ? (
            <span
              className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-300"
              style={{ borderColor: `${glow}44` }}
            >
              {dateLabel}
            </span>
          ) : null}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
            <OgLeagueMark leagueId={game.leagueId} size={14} />
          </div>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Open slate
        </span>
      </div>

      <div
        className="flex flex-1 flex-col items-center justify-center rounded-[18px] border border-slate-800 px-3 py-4"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.88)",
          borderColor: `${glow}44`,
          boxShadow: `0 0 24px ${glow}22`,
        }}
      >
        <div className="flex w-full items-center justify-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-white"
              style={{ borderColor: `${glow}55` }}
            >
              {game.awayTeam}
            </div>
            <span className="truncate text-xs font-bold tracking-wide text-white">
              {game.awayTeam}
            </span>
          </div>
          <span className="text-lg font-extrabold text-slate-400">@</span>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-white"
              style={{ borderColor: `${glow}55` }}
            >
              {game.homeTeam}
            </div>
            <span className="truncate text-xs font-bold tracking-wide text-white">
              {game.homeTeam}
            </span>
          </div>
        </div>
        {game.gameContextLine ? (
          <p className="mt-2 text-center text-[10px] font-medium leading-snug text-slate-300">
            {game.gameContextLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
