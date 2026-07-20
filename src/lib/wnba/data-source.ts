/** Verified WNBA ingest sources (ESPN game logs + official assignments). */
export function isWnbaVerifiedData(source: string | undefined): boolean {
  return source === "espn" || source === "wnba-stats-api";
}

export function isWnbaSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "synthetic";
}
