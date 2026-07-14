import { RefWhistleFatigueSection } from "@/components/RefWhistleFatigueSection";
import { computeRefWhistleFatigue } from "@/lib/whistle-fatigue";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

export function RefWhistleFatigueBlock({
  leagueId,
  profile,
  showMetrics = true,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
  showMetrics?: boolean;
}) {
  const fatigueProfile = computeRefWhistleFatigue(leagueId, profile);
  if (!fatigueProfile) return null;

  return (
    <RefWhistleFatigueSection
      profile={fatigueProfile}
      showMetrics={showMetrics}
    />
  );
}
