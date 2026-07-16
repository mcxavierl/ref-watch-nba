import type { LeagueId } from "@/lib/leagues";
import {
  MARQUEE_CI_MIN_GAMES,
  MIN_MARQUEE_COMPARISON_GAMES,
  passesMarqueeComparisonGate,
} from "@/lib/marquee-metrics.constants";

export {
  MARQUEE_CI_MIN_GAMES,
  MIN_MARQUEE_COMPARISON_GAMES,
  passesMarqueeComparisonGate,
};

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
