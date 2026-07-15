import { AnalyticsLeadersSection } from "@/components/AnalyticsLeadersSection";
import type { NflLeaderEntry } from "@/lib/nfl/analytics-leaders";

export function NflAnalyticsLeaders({ leaders }: { leaders: NflLeaderEntry[] }) {
  return (
    <AnalyticsLeadersSection
      leaders={leaders}
      leagueId="nfl"
      hrefPrefix="/nfl"
      sport="nfl"
      title="Official analytics leaders"
      lead="ESPN-verified penalty and scoring splits, descriptive tendencies, not picks."
    />
  );
}
