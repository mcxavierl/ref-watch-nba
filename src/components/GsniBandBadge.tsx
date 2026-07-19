import type { GsniBand } from "@/lib/gsni-display";
import { gsniBandTitle } from "@/lib/gsni-display";

const BAND_CLASS: Record<GsniBand, string> = {
  quiet: "gsni-band-badge gsni-band-badge--quiet",
  neutral: "gsni-band-badge gsni-band-badge--neutral",
  heavy: "gsni-band-badge gsni-band-badge--heavy",
};

/** Primary Quiet / Neutral / Heavy label derived from the GSNI Z-score. */
export function GsniBandBadge({
  band,
  extreme = false,
  className = "",
}: {
  band: GsniBand;
  extreme?: boolean;
  className?: string;
}) {
  const label = extreme ? `Extreme ${gsniBandTitle(band)}` : gsniBandTitle(band);

  return (
    <span className={`pill-constrain ${BAND_CLASS[band]} ${className}`.trim()}>
      <span className="pill-constrain-text">{label}</span>
    </span>
  );
}
