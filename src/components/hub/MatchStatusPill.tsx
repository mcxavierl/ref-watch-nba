type MatchStatusPillTone = "clinical" | "prestige";

type MatchStatusPillProps = {
  label: string;
  tone?: MatchStatusPillTone;
  className?: string;
};

const TONE_CLASS: Record<MatchStatusPillTone, string> = {
  clinical:
    "bg-slate-700 text-slate-50",
  prestige:
    "match-status-pill--prestige bg-[#BFA86A] text-white",
};

/**
 * Clinical Modern match status signal for card headers.
 * Default: cool slate pill. Prestige: champagne-gold for World Cup finals.
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
