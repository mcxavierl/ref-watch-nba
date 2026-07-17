import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";
import { preloadCbbConferenceCoverageFromAssets } from "@/lib/cbb/conference-coverage-preload";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

/** Conference badges depend on runtime asset preload — avoid stale SSG HTML. */
export const dynamic = "force-dynamic";

export default async function CbbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/cbb";
  await preloadLeagueRefStatsForPath(SITE_URL, "cbb", pathname);
  await preloadCbbConferenceCoverageFromAssets(SITE_URL);
  return <CollegeLeagueGate leagueId="cbb">{children}</CollegeLeagueGate>;
}
