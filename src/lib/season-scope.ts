export function formatSeasonScope(seasonCount: number): string {
  if (seasonCount <= 0) return "-";
  if (seasonCount === 1) return "1 season";
  return `Last ${seasonCount} seasons`;
}
