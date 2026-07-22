import type { AssignmentsFile, RefStatsFile, TeamCrewSplit } from "@/lib/types";

/** Normalize middleware / header pathname before route-scoped preload. */
export function normalizeAppPathname(
  pathname: string | null | undefined,
): string {
  if (!pathname || typeof pathname !== "string") return "/";
  const trimmed = pathname.split("?")[0]?.split("#")[0]?.trim() ?? "/";
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isRefStatsPayload(value: unknown): value is RefStatsFile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as RefStatsFile;
  return (
    Array.isArray(candidate.refs) &&
    typeof candidate.meta === "object" &&
    candidate.meta !== null
  );
}

export function isTeamSplitsPayload(
  value: unknown,
): value is Record<string, TeamCrewSplit[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((rows) => Array.isArray(rows));
}

export function isGameLogsPayload(
  value: unknown,
): value is { games: unknown[]; lastUpdated?: string; league?: string; source?: string } {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { games?: unknown }).games);
}

export function isAssignmentsPayload(value: unknown): value is AssignmentsFile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as AssignmentsFile;
  return Array.isArray(candidate.games);
}
