import { formatFindingSampleMeta } from "@/lib/finding-copy";
import type { ScoredFindingBase } from "@/lib/findings-shared";
import {
  MIN_MARKET_EXPECTATION_GAMES,
  pickStrongestMarketAtsOutlier,
} from "@/lib/ref-market-expectation";
import type { RefStatsFile } from "@/lib/types";

function formatCoverPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * ATS outlier from market-expectation enrichment (independent of straight-up W-L).
 * Returns null when scoped stats were not enriched or no ref clears the gate.
 */
export function buildMarketExpectationAtsFinding(
  stats: RefStatsFile,
  rankScoreFn: (
    effectSize: number,
    sampleGames: number,
    minSample: number,
  ) => number,
): ScoredFindingBase | null {
  if (!stats.meta.atsAvailable) return null;

  const pick = pickStrongestMarketAtsOutlier(stats);
  if (!pick) return null;

  const { ref, market } = pick;
  const edge = Math.abs(market.deviationFromNeutral);
  const direction =
    market.outlierDirection === "covers_more" ? "cover" : "fail to cover";
  const correlationNote =
    market.underdogCoverCorrelation !== null
      ? ` Underdog ATS correlation: ${(market.underdogCoverCorrelation * 100).toFixed(0)}% (φ).`
      : "";

  return {
    id: "ats-outlier",
    category: "ats-edge",
    headline: `${ref.name}: teams ${direction} ${formatCoverPct(market.coverRate)} ATS vs market`,
    summary: `Across ${market.linedGames} lined games, teams are ${formatCoverPct(market.coverRate)} against the spread with ${ref.name} - ${(edge * 100).toFixed(1)} pts from a neutral 50% split, independent of straight-up wins.${correlationNote}`,
    explainer:
      "Performance vs. market expectation uses closing spreads only (lineSource=external). Synthetic lines are excluded.",
    stats: [
      {
        label: "ATS cover",
        value: formatCoverPct(market.coverRate),
        detail: `${market.atsCovers}-${market.atsLosses}-${market.atsPushes}`,
      },
      {
        label: "Sample",
        value: String(market.linedGames),
        detail: `Min ${MIN_MARKET_EXPECTATION_GAMES} lined games`,
      },
      {
        label: "Deviation vs 50%",
        value: `${(edge * 100).toFixed(1)} pts`,
        detail: "Absolute ATS deviation",
      },
    ],
    sampleNote: formatFindingSampleMeta(
      market.linedGames,
      stats.meta.seasons,
    ),
    links: [{ label: ref.name, href: `/refs/${ref.slug}` }],
    score: rankScoreFn(edge, market.linedGames, MIN_MARKET_EXPECTATION_GAMES),
    sampleGames: market.linedGames,
  };
}
