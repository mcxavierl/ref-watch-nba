import { RefMarqueePerformanceSection } from "@/components/RefMarqueePerformanceSection";
import { computeRefMarqueePerformance } from "@/lib/marquee-metrics";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

const FOUL_LABELS: Partial<Record<LeagueId, string>> = {
  nfl: "Flags per game",
  nhl: "Minors per game",
  epl: "Cards per game",
  laliga: "Cards per game",
};

export function RefMarqueePerformanceBlock({
  leagueId,
  profile,
  showMetrics = true,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
  showMetrics?: boolean;
}) {
  const performance = computeRefMarqueePerformance(leagueId, profile);
  if (!performance) return null;

  return (
    <RefMarqueePerformanceSection
      performance={performance}
      showMetrics={showMetrics}
      foulLabel={FOUL_LABELS[leagueId] ?? "Fouls per game"}
    />
  );
}
