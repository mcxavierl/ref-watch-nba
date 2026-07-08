/** True when an official has a real jersey number (NBA/NHL/NFL crew IDs). */
export function hasRefJerseyNumber(number: number): boolean {
  return number > 0;
}

/** e.g. "#42" or null when no jersey number (EPL and other leagues without IDs). */
export function formatRefJerseyNumber(number: number): string | null {
  return hasRefJerseyNumber(number) ? `#${number}` : null;
}

/** e.g. "Scott Foster (#48)" or just "Anthony Taylor" when no jersey number. */
export function formatRefNameWithNumber(name: string, number: number): string {
  const badge = formatRefJerseyNumber(number);
  return badge ? `${name} (${badge})` : name;
}

/** e.g. "#42 · 89 games" or "89 matches" when no jersey number. */
export function formatRefGamesMeta(
  number: number,
  games: number,
  unit: string,
): string {
  const badge = formatRefJerseyNumber(number);
  return badge ? `${badge} · ${games} ${unit}` : `${games} ${unit}`;
}
