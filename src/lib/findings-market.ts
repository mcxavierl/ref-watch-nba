import { formatFindingSampleMeta } from "@/lib/finding-copy";
import { atsOutlierHeadline } from "@/lib/insight-headlines";
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

  return {
    id: "ats-outlier",
    category: "ats-edge",
    headline: atsOutlierHeadline(
      ref.name,
      market.coverRate,
      formatCoverPct(market.coverRate),
    ),
    summary: `Across ${market.linedGames} lined games, teams are ${formatCoverPct(market.coverRate)} against the spread with ${ref.name} - ${(edge * 100).toFixed(1)} pts from a neutral 50% split, independent of straight-up wins.`,
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
