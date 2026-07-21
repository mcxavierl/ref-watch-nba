import type { RefIntelligenceProfile } from "@/lib/ref-intelligence-profile";
import { RefCrewPartnersCard } from "@/components/ref-profile/RefCrewPartnersCard";
import { RefTeamImpactSearch } from "@/components/ref-profile/RefTeamImpactSearch";
import type { LeagueId } from "@/lib/leagues";

export function RefHistoricalImpactSection({
  profile,
  leagueId,
}: {
  profile: RefIntelligenceProfile;
  leagueId: LeagueId;
}) {
  return (
    <section className="ref-historical-impact-grid" aria-label="Historical impact and graph connections">
      <RefCrewPartnersCard partners={profile.crewPartners} leagueId={leagueId} />
      <RefTeamImpactSearch teams={profile.teamImpacts} />
    </section>
  );
}
