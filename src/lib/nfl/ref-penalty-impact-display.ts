import type { ShrunkNflAnalyticsDisplay } from "@/lib/nfl/penalty-shrinkage";
import type { NflRefAnalytics } from "@/lib/types";

export type WhistleMetricView = "volume" | "leverage";

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 10) / 10}`;
}

export function resolveWhistleMetricDisplay(
  analytics: NflRefAnalytics,
  view: WhistleMetricView,
  shrunk?: ShrunkNflAnalyticsDisplay,
): { label: string; value: string; detail: string; tooltip?: string } {
  if (view === "leverage" && analytics.avgHighLeverageImpactPerGame !== undefined) {
    const impact = shrunk?.avgHighLeverageImpactPerGame;
    const delta = shrunk?.highLeverageImpactDelta;
    return {
      label: "High-leverage impact",
      value: String(impact?.display ?? analytics.avgHighLeverageImpactPerGame),
      detail: `${formatDelta(delta?.display ?? analytics.highLeverageImpactDelta ?? 0)} vs league avg`,
      tooltip: impact?.tooltip,
    };
  }

  const flags = shrunk?.avgFlagsPerGame;
  const delta = shrunk?.flagsDelta;
  return {
    label: "Flags per game",
    value: String(flags?.display ?? analytics.avgFlagsPerGame),
    detail: `${formatDelta(delta?.display ?? analytics.flagsDelta)} vs league avg`,
    tooltip: flags?.tooltip,
  };
}
