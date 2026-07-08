import type { RefOfficial, RefProfile, RefRole, RefStatsFile } from "@/lib/types";

export function isNhlReferee(
  ref: Pick<RefProfile, "role" | "nhlAnalytics">,
): boolean {
  if (ref.role === "referee") return true;
  if (ref.role === "linesman") return false;
  return ref.nhlAnalytics !== undefined;
}

export function isNhlLinesman(
  ref: Pick<RefProfile, "role" | "nhlAnalytics">,
): boolean {
  if (ref.role === "linesman") return true;
  if (ref.role === "referee") return false;
  return ref.nhlAnalytics === undefined;
}

export function isNhlLinesmanOfficial(official: RefOfficial): boolean {
  return official.role === "linesman";
}

export function filterNhlReferees(refs: RefProfile[]): RefProfile[] {
  return refs.filter(isNhlReferee);
}

export function nhlAnalyticsRefStats(stats: RefStatsFile): RefStatsFile {
  return { ...stats, refs: filterNhlReferees(stats.refs) };
}

export function linesmanSlugSet(refs: RefProfile[]): ReadonlySet<string> {
  return new Set(refs.filter(isNhlLinesman).map((ref) => ref.slug));
}

export function officialRoleBadgeLabel(role: RefRole | undefined): string | null {
  if (role === "linesman") return "LIN";
  return null;
}
