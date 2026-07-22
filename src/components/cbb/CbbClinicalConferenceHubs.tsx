import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { getConferenceCoverageRows } from "@/lib/ncaa-conference-coverage";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import { cbbTrendsConferenceSlug } from "@/lib/cbb/conference-trends-shared";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";
import "@/components/conference-coverage.css";
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
            <Link
              href={`/cbb?conference=${cbbTrendsConferenceSlug(row.conferenceId)}`}
              className="cbb-clinical-conference-tag cbb-clinical-conference-tag-link"
            >
              <NcaaConferenceLogo
                conferenceId={row.conferenceId as LiveNcaaConferenceId}
                size={22}
              />
              <span>{row.conferenceId}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
