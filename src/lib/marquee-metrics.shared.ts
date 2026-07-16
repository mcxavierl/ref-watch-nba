import type { LeagueId } from "@/lib/leagues";
import {
  MARQUEE_CI_MIN_GAMES,
  MIN_MARQUEE_COMPARISON_GAMES,
} from "@/lib/marquee-metrics.constants";

export { MARQUEE_CI_MIN_GAMES, MIN_MARQUEE_COMPARISON_GAMES };

export interface RefMarqueePerformance {
  refSlug: string;
  leagueId: LeagueId;
  marqueeGames: number;
  baselineGames: number;
  marqueeOverRate: number;
  baselineOverRate: number;
  marqueeAtsCoverRate: number | null;
  baselineAtsCoverRate: number | null;
  marqueeAvgFouls: number;
  baselineAvgFouls: number;
  overRateCi: { low: number; high: number; label: string } | null;
  atsCoverCi: { low: number; high: number; label: string } | null;
  sampleTags: string[];
}

export function passesMarqueeComparisonGate(
  performance: RefMarqueePerformance,
): boolean {
  return (
    performance.marqueeGames >= MIN_MARQUEE_COMPARISON_GAMES &&
    performance.baselineGames >= MIN_MARQUEE_COMPARISON_GAMES
  );
}
