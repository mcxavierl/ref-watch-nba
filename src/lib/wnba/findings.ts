import { getRefStats } from "@/lib/wnba/data";
import { buildScopedRefStats } from "@/lib/scoped-ref-stats";
import type { Finding } from "@/lib/findings-shared";

export type { Finding, FindingCategory } from "@/lib/findings-shared";
export { FINDING_CATEGORY_LABELS } from "@/lib/findings-shared";

function resolveStats(scopedSeasons?: string[]) {
  const full = getRefStats();
  if (!scopedSeasons?.length) return full;
  return buildScopedRefStats("wnba", full, scopedSeasons);
}

export function computeFindings(
  _limit = 6,
  scopedSeasons?: string[],
  _options?: { hub?: boolean },
): Finding[] {
  const stats = resolveStats(scopedSeasons);
  if (stats.refs.length === 0) return [];
  return [];
}

export function computeAllFindings(
  scopedSeasons?: string[],
  _options?: { hub?: boolean },
): Finding[] {
  return computeFindings(undefined, scopedSeasons, _options);
}
