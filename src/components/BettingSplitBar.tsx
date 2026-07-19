import type { BettingSplitFlow } from "@/lib/leverage-index";

/** Two-tone handle track: public (slate) vs sharp (indigo) money flow. */
export function BettingSplitBar({
  split,
  className = "",
}: {
  split: BettingSplitFlow;
  className?: string;
}) {
  const publicPct = Math.max(0, Math.min(100, Math.round(split.publicPct)));
  const sharpPct = Math.max(0, Math.min(100, Math.round(split.sharpPct)));

  return (
    <div
      className={`betting-split-bar min-w-0 ${className}`.trim()}
      title={`Public ${publicPct}% · Sharp ${sharpPct}%`}
      aria-label={`Betting handle split: ${publicPct}% public, ${sharpPct}% sharp`}
    >
      <div className="betting-split-bar__labels">
        <span className="betting-split-bar__label">Public {publicPct}%</span>
        <span className="betting-split-bar__label betting-split-bar__label--sharp">
          Sharp {sharpPct}%
        </span>
      </div>
      <div className="betting-split-bar__track" aria-hidden>
        <span
          className="betting-split-bar__segment betting-split-bar__segment--public"
          style={{ width: `${publicPct}%` }}
        />
        <span
          className="betting-split-bar__segment betting-split-bar__segment--sharp"
          style={{ width: `${sharpPct}%` }}
        />
      </div>
    </div>
  );
}
