import { LeagueUnderDevelopment } from "@/components/LeagueUnderDevelopment";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getRefStats as getEplRefStats } from "@/lib/epl/data";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { shouldShowUnverifiedData } from "@/lib/show-unverified";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";
import type { RefStatsFile } from "@/lib/types";

const REF_LOADERS: Record<"nhl" | "nfl" | "epl", () => RefStatsFile> = {
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
  epl: getEplRefStats,
};

type GatedLeagueId = keyof typeof REF_LOADERS;

export async function LeagueUnderDevelopmentGate({
  leagueId,
  children,
}: {
  leagueId: GatedLeagueId;
  children: React.ReactNode;
}) {
  // Await this league's ref-stats before reading them. The root layout's
  // path-based preload renders concurrently with this segment in the App
  // Router, so it can't be relied on to have populated the cache yet — on a
  // cold Worker isolate that race showed every gated league as "under
  // development" even though the verified data was present.
  const pathname = normalizeAppPathname(
    (await headers()).get("x-pathname") ?? `/${leagueId}`,
  );
  await preloadLeagueRefStatsForPath(SITE_URL, leagueId, pathname);

  const stats = REF_LOADERS[leagueId]();
  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const league = LEAGUES[leagueId as LeagueId];

  if (!verification.data_verified && !shouldShowUnverifiedData()) {
    return <LeagueUnderDevelopment leagueLabel={league.label} />;
  }

  return <>{children}</>;
}
