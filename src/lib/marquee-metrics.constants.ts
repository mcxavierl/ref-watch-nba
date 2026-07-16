/** Client-safe marquee constants (keep free of game-log loaders). */
export const MARQUEE_CI_MIN_GAMES = 20;
/** Minimum games in each arm before marquee-vs-baseline splits surface. */
export const MIN_MARQUEE_COMPARISON_GAMES = 8;

export type MarqueeComparisonSample = {
  marqueeGames: number;
  baselineGames: number;
};

/** Both marquee and non-marquee arms need sample before a split is actionable. */
export function passesMarqueeComparisonGate(
  performance: MarqueeComparisonSample,
): boolean {
  return (
    performance.marqueeGames >= MIN_MARQUEE_COMPARISON_GAMES &&
    performance.baselineGames >= MIN_MARQUEE_COMPARISON_GAMES
  );
}
