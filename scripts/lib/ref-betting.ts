/** W-L-P record for ATS or O/U. */
import { breakTieWithOvertime } from "./team-win";

export interface WlpRecord {
  wins: number;
  losses: number;
  pushes: number;
}

export interface OuBucketStat {
  label: string;
  record: WlpRecord;
}

export interface SpreadBucketStat {
  label: string;
  homeFavorite: WlpRecord;
  homeUnderdog: WlpRecord;
}

export interface RefBettingStats {
  /** Home team straight-up W-L in games this ref worked. */
  homeTeamRecord: WlpRecord;
  homeTeamAts: WlpRecord;
  avgHomeScore: number;
  avgRoadScore: number;
  avgHomeMargin: number;
  overUnder: {
    overall: WlpRecord;
    buckets: OuBucketStat[];
  };
  spreadBuckets: SpreadBucketStat[];
  /** True when lines came from a real or simulated closing-line feed. */
  linesAvailable: boolean;
}

export interface ClosingLines {
  /** Home spread (negative = home favorite, e.g. -5.5). */
  homeSpread: number;
  total: number;
}

export interface ScoredGame {
  homeScore: number;
  awayScore: number;
  homeSpread: number;
  total: number;
}

export function emptyWlp(): WlpRecord {
  return { wins: 0, losses: 0, pushes: 0 };
}

export function addWlp(record: WlpRecord, result: "win" | "loss" | "push"): void {
  if (result === "win") record.wins++;
  else if (result === "loss") record.losses++;
  else record.pushes++;
}

/** Home team against the spread (US convention: negative spread = home fav). */
export function homeAtsResult(
  homeScore: number,
  awayScore: number,
  homeSpread: number,
): "win" | "loss" | "push" {
  const margin = homeScore - awayScore;
  const adjusted = margin + homeSpread;
  if (Math.abs(adjusted) < 0.001) return "push";
  return adjusted > 0 ? "win" : "loss";
}

export function overResult(
  totalPoints: number,
  line: number,
): "win" | "loss" | "push" {
  const diff = totalPoints - line;
  if (Math.abs(diff) < 0.001) return "push";
  return diff > 0 ? "win" : "loss";
}

export function totalLineBucket(line: number): string {
  if (line < 200) return "Under 200";
  if (line < 210) return "200–209.5";
  if (line < 220) return "210–219.5";
  if (line < 230) return "220–229.5";
  return "230+";
}

export function spreadSizeBucket(absSpread: number): string {
  if (absSpread <= 4.5) return "0–4.5";
  if (absSpread <= 9.5) return "5–9.5";
  return "10+";
}

export function createEmptyBettingStats(): RefBettingStats {
  const buckets: OuBucketStat[] = [
    "Under 200",
    "200–209.5",
    "210–219.5",
    "220–229.5",
    "230+",
  ].map((label) => ({ label, record: emptyWlp() }));

  const spreadBuckets: SpreadBucketStat[] = ["0–4.5", "5–9.5", "10+"].map(
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
    linesAvailable: true,
  };
}

export class RefBettingAccumulator {
  private homeScoreSum = 0;
  private roadScoreSum = 0;
  private marginSum = 0;
  private gameCount = 0;
  readonly stats = createEmptyBettingStats();

  addGame(game: ScoredGame): void {
    const { homeScore, awayScore, homeSpread, total } = game;
    const totalPoints = homeScore + awayScore;
    const margin = homeScore - awayScore;

    this.gameCount++;
    this.homeScoreSum += homeScore;
    this.roadScoreSum += awayScore;
    this.marginSum += margin;

    if (homeScore > awayScore) addWlp(this.stats.homeTeamRecord, "win");
    else if (homeScore < awayScore) addWlp(this.stats.homeTeamRecord, "loss");
    else addWlp(this.stats.homeTeamRecord, "push");

    addWlp(this.stats.homeTeamAts, homeAtsResult(homeScore, awayScore, homeSpread));

    const ou = overResult(totalPoints, total);
    addWlp(this.stats.overUnder.overall, ou);

    const bucketLabel = totalLineBucket(total);
    const bucket = this.stats.overUnder.buckets.find((b) => b.label === bucketLabel);
    if (bucket) addWlp(bucket.record, ou);

    const absSpread = Math.abs(homeSpread);
    const spreadBucket = this.stats.spreadBuckets.find(
      (b) => b.label === spreadSizeBucket(absSpread),
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

export function generateClosingLines(rng: () => number): ClosingLines {
  const total = 205 + Math.floor(rng() * 26) + 0.5;
  const spreadMag = Math.floor(rng() * 12) + 0.5;
  const homeSpread = rng() > 0.52 ? -spreadMag : spreadMag;
  return { homeSpread, total };
}

export function scoresFromLines(
  lines: ClosingLines,
  rng: () => number,
  strengthBias = 0,
): { homeScore: number; awayScore: number } {
  const totalNoise = (rng() - 0.48) * 18;
  const targetTotal = Math.max(
    185,
    Math.min(260, Math.round(lines.total + totalNoise)),
  );
  const margin = -lines.homeSpread + (rng() - 0.5) * 12 + strengthBias;
  let homeScore = Math.round((targetTotal + margin) / 2);
  let awayScore = targetTotal - homeScore;
  homeScore = Math.max(85, Math.min(145, homeScore));
  awayScore = Math.max(85, Math.min(145, awayScore));
  const resolved = breakTieWithOvertime(homeScore, awayScore, rng);
  return { homeScore: resolved.homeScore, awayScore: resolved.awayScore };
}

export function homeCoverRate(stats: RefBettingStats): number | null {
  const { wins, losses, pushes } = stats.homeTeamAts;
  const decisions = wins + losses + pushes;
  if (decisions === 0) return null;
  return Math.round((wins / decisions) * 1000) / 1000;
}

export function ouCoverRate(stats: RefBettingStats): number | null {
  const { wins, losses, pushes } = stats.overUnder.overall;
  const decisions = wins + losses + pushes;
  if (decisions === 0) return null;
  return Math.round((wins / decisions) * 1000) / 1000;
}

export function formatWlp(r: WlpRecord): string {
  if (r.pushes > 0) return `${r.wins}-${r.losses}-${r.pushes}`;
  return `${r.wins}-${r.losses}`;
}
