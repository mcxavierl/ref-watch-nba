import { getLeagueConfigEntry } from "@/config/leagueConfig";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import {
  verifyNcaaPipelineIntegrity,
  type NcaaPipelineVerificationResult,
} from "@/lib/ncaa-pipeline";
import type { RefStatsFile } from "@/lib/types";

export const NCAA_INTEGRITY_AUDIT_HREF = "/ncaa/integrity-audit";

export type NcaaAuditPendingLabel = "Audit in Progress" | "Pending Verification";

export type NcaaAuditStatus = {
  leagueId: "cbb" | "cfb";
  coveragePct: number;
  verified: boolean;
  totalGames: number;
  verifiedGames: number;
  totalRefs: number;
  verifiedRefs: number;
  failureCount: number;
  pendingLabel: NcaaAuditPendingLabel;
  verification: NcaaPipelineVerificationResult;
};

const STATS_LOADERS = {
  cbb: getCbbRefStats,
  cfb: getCfbRefStats,
} as const;

function pendingLabelForLeague(leagueId: "cbb" | "cfb"): NcaaAuditPendingLabel {
  const registryVerified = getLeagueConfigEntry(leagueId)?.dataVerified === true;
  return registryVerified ? "Audit in Progress" : "Pending Verification";
}

export function resolveNcaaAuditStatus(
  leagueId: "cbb" | "cfb",
  stats?: RefStatsFile | null,
): NcaaAuditStatus {
  const resolved = stats ?? STATS_LOADERS[leagueId]();
  const dataLeague = leagueId === "cbb" ? "CBB" : "CFB";
  const logs = loadRuntimeGameLogs(dataLeague)?.games ?? [];
  const verification = verifyNcaaPipelineIntegrity(leagueId, resolved, logs);

  return {
    leagueId,
    coveragePct: verification.coveragePct,
    verified: verification.verified,
    totalGames: verification.totalGames,
    verifiedGames: verification.verifiedGames,
    totalRefs: verification.totalRefs,
    verifiedRefs: verification.verifiedRefs,
    failureCount: verification.failures.length,
    pendingLabel: pendingLabelForLeague(leagueId),
    verification,
  };
}

export function formatNcaaAuditPillLabel(coveragePct: number): string {
  const rounded =
    coveragePct % 1 === 0 ? String(Math.round(coveragePct)) : coveragePct.toFixed(1);
  return `Audit: ${rounded}% Complete`;
}
