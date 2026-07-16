import { AlertTriangle } from "lucide-react";
import "./cbb-clinical.css";

export function CbbClinicalProvenanceBanner() {
  return (
    <div className="cbb-clinical-provenance" role="status">
      <AlertTriangle className="cbb-clinical-provenance-icon" aria-hidden />
      <p className="cbb-clinical-provenance-copy">
        Notice: This is off-season seed data only. Main datasets will backfill upon season
        opening (approx. Nov 4).
      </p>
    </div>
  );
}
