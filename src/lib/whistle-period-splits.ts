/** Period / half whistle distributions attached to game-log entries. */

export type WhistleSplitUnit = "quarter" | "half" | "period";

export type WhistleSplitSource = "boxscore" | "play-by-play" | "match-report";

export interface WhistlePeriodBucket {
  /** 1-indexed period slot within the game unit schema. */
  period: number;
  home: number;
  away: number;
}

export interface WhistlePeriodSplits {
  unit: WhistleSplitUnit;
  buckets: WhistlePeriodBucket[];
  source: WhistleSplitSource;
}

export function gameWhistleTotal(bucket: WhistlePeriodBucket): number {
  return bucket.home + bucket.away;
}

export function hasWhistlePeriodSplits(
  splits: WhistlePeriodSplits | undefined | null,
): splits is WhistlePeriodSplits {
  return Boolean(splits?.buckets?.length);
}

export function sumBuckets(
  buckets: WhistlePeriodBucket[],
  periods: number[],
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const period of periods) {
    const bucket = buckets.find((row) => row.period === period);
    if (!bucket) continue;
    home += bucket.home;
    away += bucket.away;
  }
  return { home, away };
}
