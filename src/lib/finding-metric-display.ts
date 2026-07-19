/** Leading signed delta in finding metric detail copy (e.g. "-1.2 vs 7.3 league avg"). */
export function splitSignedMetricDetail(
  detail: string,
): { delta: string; suffix: string } | null {
  const trimmed = detail.trim();
  const match = trimmed.match(/^([+-]\d+(?:\.\d+)?(?:pp|%)?)\s*(.*)$/);
  if (!match) return null;
  return { delta: match[1]!, suffix: match[2]?.trim() ?? "" };
}

export function hasSignedMetricDetail(detail?: string): boolean {
  if (!detail) return false;
  return splitSignedMetricDetail(detail) !== null;
}
