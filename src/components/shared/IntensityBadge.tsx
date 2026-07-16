import { Activity } from "lucide-react";
import {
  getIntensityLabel,
  intensityLabelSlug,
  type MatchIntensityLabel,
} from "@/lib/match-intensity";

type IntensityBadgeProps = {
  foulCount: number;
  leagueAvgFouls?: number;
  label?: MatchIntensityLabel;
  compact?: boolean;
  className?: string;
};

export function IntensityBadge({
  foulCount,
  leagueAvgFouls,
  label,
  compact = false,
  className = "",
}: IntensityBadgeProps) {
  const resolved = label ?? getIntensityLabel(foulCount, leagueAvgFouls);
  const slug = intensityLabelSlug(resolved);

  return (
    <span
      className={`intensity-badge intensity-badge--${slug}${
        compact ? " intensity-badge--compact" : ""
      }${className ? ` ${className}` : ""}`.trim()}
      title={`${resolved} whistle pace`}
    >
      <Activity className="intensity-badge-icon" strokeWidth={2.25} aria-hidden />
      <span className="intensity-badge-label">{resolved}</span>
    </span>
  );
}
