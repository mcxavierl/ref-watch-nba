/** Wilson score interval for binomial proportion (95% default). */

export function wilsonScoreInterval(
  wins: number,
  n: number,
  z = 1.96,
): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 0 };
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin =
    (z / denom) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

export function formatWilsonPct(low: number, high: number): string {
  const lo = Math.round(low * 100);
  const hi = Math.round(high * 100);
  return `${lo}-${hi}%`;
}
