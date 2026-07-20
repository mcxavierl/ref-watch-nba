import { kpiToneStateClass } from "@/constants/colors";
import { formatGsniDelta, gsniDeltaArrow, gsniDeltaTone } from "@/lib/gsni-ui";

export function GsniDeltaValue({
  delta,
  className = "",
}: {
  delta: number;
  className?: string;
}) {
  const tone = gsniDeltaTone(delta);

  return (
    <span
      className={`gsni-delta-value inline-flex items-center gap-2 font-semibold tabular-nums ${kpiToneStateClass(tone)} ${className}`.trim()}
    >
      <span className="gsni-delta-arrow text-[0.625rem] leading-none" aria-hidden>
        {gsniDeltaArrow(delta)}
      </span>
      <span>{formatGsniDelta(delta)}</span>
    </span>
  );
}
