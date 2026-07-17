type MatchStatusPillTone = "clinical" | "prestige";

type MatchStatusPillProps = {
  label: string;
  tone?: MatchStatusPillTone;
  className?: string;
};

const TONE_CLASS: Record<MatchStatusPillTone, string> = {
  clinical:
    "border border-slate-700 bg-slate-800 text-slate-300",
  prestige:
    "match-status-pill--prestige border border-slate-700 bg-slate-800 text-slate-300",
};

/**
 * Clinical Modern match status signal for card headers.
 * Default: slate capsule pill. Prestige alias kept for API compatibility.
 */
export function MatchStatusPill({
  label,
  tone = "clinical",
  className = "",
}: MatchStatusPillProps) {
  return (
    <span
      className={`match-status-pill inline-flex h-[2.35rem] shrink-0 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-wider tabular-nums ${TONE_CLASS[tone]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
