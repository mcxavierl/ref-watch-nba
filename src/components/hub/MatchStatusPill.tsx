type MatchStatusPillProps = {
  label: string;
  className?: string;
};

/**
 * Clinical Modern match status signal for card headers.
 * Cool slate pill with high-contrast white label (Final, Live, etc.).
 */
export function MatchStatusPill({ label, className = "" }: MatchStatusPillProps) {
  return (
    <span
      className={`match-status-pill inline-flex h-[2.35rem] shrink-0 items-center rounded-full bg-slate-700 px-3 text-xs font-semibold uppercase tracking-wider text-slate-50 ${className}`.trim()}
    >
      {label}
    </span>
  );
}
