import type { GsniBand } from "@/lib/gsni-display";
import {
  gsniBandCompactLabel,
  gsniBandTitle,
  gsniQualitativeLabel,
} from "@/lib/gsni-display";

const BAND_CLASS: Record<GsniBand, string> = {
  quiet: "gsni-band-badge gsni-band-badge--quiet",
  neutral: "gsni-band-badge gsni-band-badge--neutral",
  heavy: "gsni-band-badge gsni-band-badge--heavy",
};

/** Primary frequency label derived from the Game-State Index score. */
export function GsniBandBadge({
  band,
  zScore,
  className = "",
}: {
  band: GsniBand;
  zScore?: number;
  className?: string;
}) {
  const fullLabel =
    zScore !== undefined ? gsniQualitativeLabel(zScore) : gsniBandTitle(band);
  const compactLabel =
    zScore !== undefined ? gsniBandCompactLabel(zScore) : gsniBandTitle(band);

  return (
    <span
      className={`pill-constrain gsni-band-badge-wrap ${BAND_CLASS[band]} ${className}`.trim()}
      title={fullLabel}
    >
      <span className="pill-constrain-text">{compactLabel}</span>
    </span>
  );
}
