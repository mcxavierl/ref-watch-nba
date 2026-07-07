/** Format W-L or W-L-P for display. */
export function formatWlp(wins: number, losses: number, pushes = 0): string {
  if (pushes > 0) return `${wins}-${losses}-${pushes}`;
  return `${wins}-${losses}`;
}

export function formatPctFromWlp(
  wins: number,
  losses: number,
  pushes = 0,
): string {
  const n = wins + losses + pushes;
  if (n === 0) return "—";
  return `${((wins / n) * 100).toFixed(1)}%`;
}
