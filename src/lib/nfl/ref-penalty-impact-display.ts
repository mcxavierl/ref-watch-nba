import type { NflRefAnalytics } from "@/lib/types";

export type WhistleMetricView = "volume" | "leverage";

export function resolveWhistleMetricDisplay(
  analytics: NflRefAnalytics,
  view: WhistleMetricView,
): { label: string; value: string; detail: string } {
  if (view === "leverage" && analytics.avgHighLeverageImpactPerGame !== undefined) {
    return {
      label: "High-leverage impact",
      value: String(analytics.avgHighLeverageImpactPerGame),
      detail: `${analytics.highLeverageImpactDelta !== undefined && analytics.highLeverageImpactDelta >= 0 ? "+" : ""}${analytics.highLeverageImpactDelta ?? 0} vs league avg`,
    };
  }

  return {
    label: "Flags per game",
    value: String(analytics.avgFlagsPerGame),
    detail: `${analytics.flagsDelta >= 0 ? "+" : ""}${analytics.flagsDelta} vs league avg`,
  };
}
