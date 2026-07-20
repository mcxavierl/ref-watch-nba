import { AnalyticsLeadersSection } from "@/components/AnalyticsLeadersSection";
import type { CbbLeaderEntry } from "@/lib/cbb/analytics-leaders";

export function CbbAnalyticsLeaders({
  leaders,
  title = "Official analytics leaders",
  lead = "Foul and scoring splits from verified game data. Descriptive tendencies, not picks.",
}: {
  leaders: CbbLeaderEntry[];
  title?: string;
  lead?: string;
}) {
  return (
    <AnalyticsLeadersSection
      leaders={leaders}
      leagueId="cbb"
      hrefPrefix="/cbb"
      sport="cbb"
      title={title}
      lead={lead}
    />
  );
}
