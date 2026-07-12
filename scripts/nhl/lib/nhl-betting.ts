import {
  addWlp,
  emptyWlp,
  homeAtsResult,
  homeCoverRate,
  ouCoverRate,
  overResult,
  type OuBucketStat,
  type RefBettingStats,
  type SpreadBucketStat,
} from "../../lib/ref-betting";

export { homeCoverRate, ouCoverRate };

export function createNhlBettingStats(linesAvailable = true): RefBettingStats {
  const buckets: OuBucketStat[] = [
    "Under 5.5",
    "5.5–6.5",
    "6.5–7.5",
    "7.5+",
  ].map((label) => ({ label, record: emptyWlp() }));

  const spreadBuckets: SpreadBucketStat[] = ["0–1.5", "1.5–3.5", "3.5+"].map(
    (label) => ({
      label,
      homeFavorite: emptyWlp(),
      homeUnderdog: emptyWlp(),
    }),
  );

  return {
    homeTeamRecord: emptyWlp(),
    homeTeamAts: emptyWlp(),
    avgHomeScore: 0,
    avgRoadScore: 0,
    avgHomeMargin: 0,
    overUnder: { overall: emptyWlp(), buckets },
    spreadBuckets,
    linesAvailable,
  };
}

export function nhlTotalLineBucket(line: number): string {
  if (line < 5.5) return "Under 5.5";
  if (line < 6.5) return "5.5–6.5";
  if (line < 7.5) return "6.5–7.5";
  return "7.5+";
}

export function nhlSpreadSizeBucket(absSpread: number): string {
  if (absSpread <= 1.5) return "0–1.5";
  if (absSpread <= 3.5) return "1.5–3.5";
  return "3.5+";
}

export class NhlBettingAccumulator {
  private homeScoreSum = 0;
  private roadScoreSum = 0;
  private marginSum = 0;
  private gameCount = 0;
  readonly stats: RefBettingStats;

  constructor(linesAvailable = true) {
    this.stats = createNhlBettingStats(linesAvailable);
  }

  addGame(game: {
    homeScore: number;
    awayScore: number;
    homeSpread: number;
    total: number;
  }): void {
    const { homeScore, awayScore, homeSpread, total } = game;
    const totalGoals = homeScore + awayScore;
    const margin = homeScore - awayScore;

    this.gameCount++;
    this.homeScoreSum += homeScore;
    this.roadScoreSum += awayScore;
    this.marginSum += margin;

    if (homeScore > awayScore) addWlp(this.stats.homeTeamRecord, "win");
    else if (homeScore < awayScore) addWlp(this.stats.homeTeamRecord, "loss");
    else addWlp(this.stats.homeTeamRecord, "push");

    addWlp(this.stats.homeTeamAts, homeAtsResult(homeScore, awayScore, homeSpread));

    const ou = overResult(totalGoals, total);
    addWlp(this.stats.overUnder.overall, ou);

    const bucket = this.stats.overUnder.buckets.find(
      (b) => b.label === nhlTotalLineBucket(total),
    );
    if (bucket) addWlp(bucket.record, ou);

    const spreadBucket = this.stats.spreadBuckets.find(
      (b) => b.label === nhlSpreadSizeBucket(Math.abs(homeSpread)),
    );
    if (spreadBucket) {
      const ats = homeAtsResult(homeScore, awayScore, homeSpread);
      if (homeSpread < 0) addWlp(spreadBucket.homeFavorite, ats);
      else addWlp(spreadBucket.homeUnderdog, ats);
    }
  }

  finalize(): RefBettingStats {
    if (this.gameCount > 0) {
      this.stats.avgHomeScore =
        Math.round((this.homeScoreSum / this.gameCount) * 10) / 10;
      this.stats.avgRoadScore =
        Math.round((this.roadScoreSum / this.gameCount) * 10) / 10;
      this.stats.avgHomeMargin =
        Math.round((this.marginSum / this.gameCount) * 10) / 10;
    }
    return this.stats;
  }
}
