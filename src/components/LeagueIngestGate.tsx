import { ingestTicketUrl, resolveLeagueVerification } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import type { RefStatsFile } from "@/lib/types";
import { LeagueIngestGateClient } from "@/components/LeagueIngestGateClient";

const REF_LOADERS: Record<"nhl" | "nfl", () => RefStatsFile> = {
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
};

const INGEST_ISSUE: Record<"nhl" | "nfl", number> = {
  nhl: 6,
  nfl: 7,
};

type GatedLeagueId = "nhl" | "nfl";

export function LeagueIngestGate({
  leagueId,
  children,
}: {
  leagueId: GatedLeagueId;
  children: React.ReactNode;
}) {
  const stats = REF_LOADERS[leagueId]();
  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const league = LEAGUES[leagueId as LeagueId];

  return (
    <LeagueIngestGateClient
      dataVerified={verification.data_verified}
      leagueLabel={league.label}
      ticketUrl={ingestTicketUrl(leagueId)}
      ticketNumber={INGEST_ISSUE[leagueId]}
    >
      {children}
    </LeagueIngestGateClient>
  );
}
