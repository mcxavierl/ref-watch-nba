import { Suspense } from "react";
import { CbbConferenceNav } from "@/components/cbb/CbbConferenceNav";
import { preloadCbbConferenceCoverageFromAssets } from "@/lib/cbb/conference-coverage-preload";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
import { getConferenceCoverageRows } from "@/lib/ncaa-conference-coverage";
import { SITE_URL } from "@/lib/site";
import "./cbb-research-terminal.css";

type CbbConferenceNavSectionProps = {
  activeConference?: CbbTrendsConferenceScope;
};

export async function CbbConferenceNavSection({
  activeConference = "all",
}: CbbConferenceNavSectionProps) {
  await preloadCbbConferenceCoverageFromAssets(SITE_URL);
  const coverageRows = getConferenceCoverageRows("cbb");

  return (
    <div className="cbb-research-terminal-nav-wrap">
      <header className="cbb-research-terminal-nav-head">
        <p className="cbb-research-terminal-eyebrow">Research terminal</p>
        <h2 className="cbb-research-terminal-nav-title" id="cbb-conference-nav-heading">
          Conference scope
        </h2>
        <p className="cbb-research-terminal-nav-lead">
          Filter referee analytics by power-conference territory. Counts reflect verified
          games with crew coverage.
        </p>
      </header>
      <Suspense fallback={null}>
        <CbbConferenceNav
          coverageRows={coverageRows}
          activeConference={activeConference}
        />
      </Suspense>
    </div>
  );
}
