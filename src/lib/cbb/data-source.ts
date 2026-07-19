import type { RefStatsFile } from "@/lib/types";

export function isCbbVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

export function isCbbSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}
