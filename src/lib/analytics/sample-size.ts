/** Professional-grade minimum sample before publishing archetype or leverage metrics. */
export const SAMPLE_SIZE_THRESHOLD = 15;

export type DataQualityState = "ok" | "insufficient";

export function meetsSampleSizeThreshold(gameCount: number): boolean {
  return gameCount >= SAMPLE_SIZE_THRESHOLD;
}

export function dataQualityFromSampleSize(gameCount: number): DataQualityState {
  return meetsSampleSizeThreshold(gameCount) ? "ok" : "insufficient";
}
