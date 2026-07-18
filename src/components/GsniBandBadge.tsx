import type { GsniBand } from "@/lib/gsni-display";
import { gsniBandTitle } from "@/lib/gsni-display";

const BAND_CLASS: Record<GsniBand, string> = {
  quiet: "gsni-band-badge gsni-band-badge--quiet",
  neutral: "gsni-band-badge gsni-band-badge--neutral",
  heavy: "gsni-band-badge gsni-band-badge--heavy",
};

/** Primary Quiet / Neutral / Heavy label derived from the GSNI index. */
export function GsniBandBadge({
  band,
  className = "",
}: {
  band: GsniBand;
  className?: string;
}) {
  return (
    <span className={`${BAND_CLASS[band]} ${className}`.trim()}>
      {gsniBandTitle(band)}
    </span>
  );
}
