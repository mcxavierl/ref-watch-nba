import { AnalyticsLeadersSection } from "@/components/AnalyticsLeadersSection";
import type { NflLeaderEntry } from "@/lib/cfb/analytics-leaders";

export function CfbAnalyticsLeaders({ leaders }: { leaders: NflLeaderEntry[] }) {
  return (
    <AnalyticsLeadersSection
      leaders={leaders}
      leagueId="cfb"
      hrefPrefix="/cfb"
      sport="cfb"
      title="Official analytics leaders"
      lead="Penalty and scoring splits from the historical dataset, descriptive tendencies, not picks."
    />
  );
}
