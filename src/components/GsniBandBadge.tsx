import { Pill } from "@/components/ui/Pill";
import type { GsniBand } from "@/lib/gsni-display";
import {
  gsniBandTitle,
  gsniCategoryLabel,
  gsniQualitativeLabel,
} from "@/lib/gsni-display";

/** Category pill for Game-State Index cards (Elevated, Neutral, Suppressed). */
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
    zScore !== undefined ? gsniCategoryLabel(zScore) : gsniBandTitle(band);

  return (
    <Pill variant="category" className={className} title={fullLabel}>
      {compactLabel}
    </Pill>
  );
}
