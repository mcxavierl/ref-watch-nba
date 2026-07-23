import { DailyBriefingBanner } from "@/components/DailyBriefingBanner";
import { IntelligenceHero } from "@/components/dashboard/IntelligenceHero";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type OverviewIntelligenceHeroProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceHero({ data }: OverviewIntelligenceHeroProps) {
  const matchupCount = data.upcomingSlate.games.length;

  return (
    <div className="overview-intelligence-hero space-y-4">
      <IntelligenceHero />
      <DailyBriefingBanner
        matchupCount={matchupCount}
        liveLeagueCount={data.liveLeagueCount}
      />
    </div>
  );
}
