import {
  hasNcaaLiveConferenceCoverage,
} from "@/lib/ncaa-conference-gate";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";
import { ConferenceCoverage } from "@/components/ConferenceCoverage";
import { CoverageComingSoon } from "@/components/CoverageComingSoon";
import type { NcaaRouteLeague } from "@/lib/ncaa-conference-gate";
import "@/components/conference-coverage.css";

const REF_LOADERS = {
  cbb: getCbbRefStats,
  cfb: getCfbRefStats,
} as const;

export function CollegeLeagueGate({
  leagueId,
  children,
}: {
  leagueId: NcaaRouteLeague;
  children: React.ReactNode;
}) {
  const stats = REF_LOADERS[leagueId]();

  if (!hasNcaaLiveConferenceCoverage(leagueId, stats)) {
    return (
      <>
        <ConferenceCoverage leagueId={leagueId} />
        <CoverageComingSoon leagueId={leagueId} />
      </>
    );
  }

  return (
    <>
      <ConferenceCoverage leagueId={leagueId} />
      {children}
    </>
  );
}
