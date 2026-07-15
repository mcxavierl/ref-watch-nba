import { AnalyticsLeadersSection } from "@/components/AnalyticsLeadersSection";
import type { EplLeaderEntry } from "@/lib/epl/analytics-leaders";

export function EplAnalyticsLeaders({
  leaders,
  hrefPrefix = "/epl",
}: {
  leaders: EplLeaderEntry[];
  hrefPrefix?: string;
}) {
  return (
    <AnalyticsLeadersSection
      leaders={leaders}
      leagueId={hrefPrefix === "/laliga" ? "laliga" : "epl"}
      hrefPrefix={hrefPrefix}
      sport={hrefPrefix === "/laliga" ? "laliga" : "epl"}
      title="Referee analytics leaders"
      lead="Goal, foul, and card splits from the historical dataset, descriptive tendencies, not picks."
    />
  );
}
