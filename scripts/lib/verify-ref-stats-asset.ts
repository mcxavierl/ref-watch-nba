/**
 * Shared ref-stats JSON checks for pre-deploy (local) and post-deploy (production) gates.
 * Keep verify-production-deploy.ts and check-deploy-readiness.ts aligned via this module.
 */
import { isCfbSimulatedData } from "../../src/lib/cfb/data-source";
import type { RefStatsFile } from "../../src/lib/types";
import { isWnbaOfficialsPending } from "./volume-regression";

export function isRefStatsOfficialsPending(
  assetPath: string,
  data: RefStatsFile,
): boolean {
  if (assetPath.includes("/wnba/")) {
    return isWnbaOfficialsPending(data);
  }
  if (assetPath.includes("/cfb/")) {
    return (
      isCfbSimulatedData(data.meta?.source) && (data.refs?.length ?? 0) === 0
    );
  }
  return false;
}

/** Returns human-readable failure messages (empty when valid). */
export function validateRefStatsAsset(
  assetPath: string,
  data: RefStatsFile,
): string[] {
  const failures: string[] = [];
  const refs = data.refs?.length ?? 0;
  const games = data.meta?.totalGamesProcessed ?? 0;
  const officialsPending = isRefStatsOfficialsPending(assetPath, data);

  if (refs === 0 && !officialsPending) {
    failures.push(`${assetPath}: refs array is empty`);
  }
  if (games === 0) {
    failures.push(`${assetPath}: totalGamesProcessed is 0`);
  }
  if (!data.meta?.data_verified) {
    failures.push(`${assetPath}: data_verified is false`);
  }
  return failures;
}
