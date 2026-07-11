import type { TeamCrewSplit } from "@/lib/types";

/** True when Node `data/` reads are expected (local dev / CI), not Cloudflare Workers. */
export function allowNodeDataFs(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Avoid sync-parsing multi-MB team-splits.json on Workers when CDN cache missed. */
export function diskTeamSplitsFallback(
  loadFromDisk: () => Record<string, TeamCrewSplit[]>,
): Record<string, TeamCrewSplit[]> {
  if (!allowNodeDataFs()) return {};
  return loadFromDisk();
}
