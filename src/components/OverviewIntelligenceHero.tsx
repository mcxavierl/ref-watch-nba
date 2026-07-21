import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { IntelligenceHero } from "@/components/dashboard/IntelligenceHero";
import { buildIntelligenceHeroView } from "@/lib/homepage-intelligence";

type OverviewIntelligenceHeroProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceHero({ data }: OverviewIntelligenceHeroProps) {
  const view = buildIntelligenceHeroView(data);
  return <IntelligenceHero view={view} />;
}
