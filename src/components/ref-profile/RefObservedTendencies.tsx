import type { ObservedTendency } from "@/lib/ref-intelligence-profile";
import { ClinicalCard } from "@/components/hub/ClinicalCard";

export function RefObservedTendencies({
  tendencies,
}: {
  tendencies: ObservedTendency[];
}) {
  return (
    <ClinicalCard
      as="section"
      className="ref-profile-section ref-observed-tendencies"
      aria-labelledby="ref-observed-tendencies-title"
    >
      <div className="ref-table-section-header">
        <p className="ref-profile-section-kicker">Evidentiary profile</p>
        <h2 id="ref-observed-tendencies-title" className="ref-profile-section-title m-0">
          Observed Tendencies
        </h2>
      </div>
      <ul className="ref-observed-tendencies-list">
        {tendencies.map((tendency) => (
          <li key={tendency.id} className="ref-observed-tendency-item">
            <span className="ref-observed-tendency-check" aria-hidden>
              ✓
            </span>
            <span>{tendency.statement}</span>
          </li>
        ))}
      </ul>
    </ClinicalCard>
  );
}
