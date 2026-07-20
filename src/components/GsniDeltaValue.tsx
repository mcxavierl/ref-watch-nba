import { formatGsniDelta, gsniDeltaArrow, gsniDeltaTone } from "@/lib/gsni-ui";

export function GsniDeltaValue({
  delta,
  className = "",
}: {
  delta: number;
  className?: string;
}) {
  const tone = gsniDeltaTone(delta);
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-slate-400";

  return (
    <span
      className={`gsni-delta-value inline-flex items-center gap-0.5 font-semibold tabular-nums ${toneClass} ${className}`.trim()}
    >
      <span className="gsni-delta-arrow text-[0.625rem] leading-none" aria-hidden>
        {gsniDeltaArrow(delta)}
      </span>
      <span>{formatGsniDelta(delta)}</span>
    </span>
  );
}
