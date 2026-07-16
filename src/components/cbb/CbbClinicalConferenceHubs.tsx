import { getConferenceCoverageRows } from "@/lib/ncaa-conference-coverage";
import "./cbb-clinical.css";

export function CbbClinicalConferenceHubs() {
  const coverageRows = getConferenceCoverageRows("cbb");

  return (
    <section
      className="cbb-clinical-panel cbb-clinical-conference-panel"
      aria-labelledby="cbb-clinical-conference-heading"
    >
      <h2 className="cbb-clinical-conference-title" id="cbb-clinical-conference-heading">
        Conference Hubs: Pre-Season Status
      </h2>
      <ul className="cbb-clinical-conference-tags" role="list">
        {coverageRows.map((row) => (
          <li key={row.conferenceId}>
            <span className="cbb-clinical-conference-tag">{row.conferenceId}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
