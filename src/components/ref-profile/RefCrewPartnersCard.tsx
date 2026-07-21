import Link from "next/link";
import type { CrewPartnerSynergy } from "@/lib/graph/crew-partners";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import type { LeagueId } from "@/lib/leagues";
import { leagueHref } from "@/lib/leagues";
import { formatSigned } from "@/lib/stats-utils";

export function RefCrewPartnersCard({
  partners,
  leagueId,
}: {
  partners: CrewPartnerSynergy[];
  leagueId: LeagueId;
}) {
  return (
    <ClinicalCard
      as="section"
      className="ref-profile-section ref-crew-partners-card"
      aria-labelledby="ref-crew-partners-title"
    >
      <div className="ref-table-section-header">
        <p className="ref-profile-section-kicker">Knowledge graph</p>
        <h2 id="ref-crew-partners-title" className="ref-profile-section-title m-0">
          Frequent Crew Partners &amp; Synergy
        </h2>
      </div>

      {partners.length === 0 ? (
        <p className="ref-crew-partners-empty text-sm text-muted">
          Insufficient shared-crew sample to rank co-official synergy.
        </p>
      ) : (
        <ul className="ref-crew-partners-list">
          {partners.map((partner, index) => (
            <li key={partner.partnerSlug} className="ref-crew-partner-row">
              <div className="ref-crew-partner-rank tabular-nums">#{index + 1}</div>
              <div className="ref-crew-partner-copy">
                <Link
                  href={leagueHref(leagueId, `/refs/${partner.partnerSlug}`)}
                  className="ref-crew-partner-name"
                >
                  {partner.partnerName}
                </Link>
                <p className="ref-crew-partner-meta tabular-nums">
                  {partner.sharedGames} shared games ·{" "}
                  {formatSigned(partner.combinedFoulVarianceDelta, 1)} foul variance delta
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ClinicalCard>
  );
}
