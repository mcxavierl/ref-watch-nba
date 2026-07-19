import { OgLeagueMark } from "@/components/og-components/og-league-mark";
import { leagueAccentColor } from "@/components/og-components/league-accent";
import type { OgLeagueHubCardData } from "@/components/og-components/types";
import { formatLeaguePaceValue } from "@/lib/league-pace-bars";
import { isCollegeLiveLeague } from "@/lib/verified-live-leagues";

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Dashboard league hub card for OG snapshots (matches overview chooser styling). */
export function LeagueHubCard({ card }: { card: OgLeagueHubCardData }) {
  const collegeTier = isCollegeLiveLeague(card.leagueId);
  const accent = leagueAccentColor(card.leagueId);
  const highlighted = card.highlighted === true;

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border bg-slate-900 p-3 ${
        highlighted ? "border-slate-600 shadow-lg" : "border-slate-800"
      }`.trim()}
      style={{
        boxShadow: highlighted
          ? `0 0 0 1px ${accent}55, 0 12px 28px ${accent}22`
          : undefined,
      }}
    >
      <div
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`,
        }}
      />
      <div className="flex min-w-0 items-start gap-2.5 pt-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
          <OgLeagueMark leagueId={card.leagueId} size={16} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {collegeTier ? (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              College sports
            </span>
          ) : null}
          <span className="truncate text-sm font-bold text-slate-50">
            {collegeTier ? card.shortLabel : card.label}
          </span>
          <span className="text-[10px] font-medium tabular-nums text-slate-400">
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
          <div className="mt-1 flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-2 text-[10px] text-slate-400">
              <span>{card.whistleLabel}</span>
              <strong className="text-xs font-bold tabular-nums text-slate-100">
                {formatLeaguePaceValue(card.whistlePerGame)}
              </strong>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-[10px] text-slate-400">
              <span>{card.scoreLabel}</span>
              <strong className="text-xs font-bold tabular-nums text-slate-100">
                {formatLeaguePaceValue(card.scorePerGame)}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Open hub
      </div>
    </div>
  );
}
