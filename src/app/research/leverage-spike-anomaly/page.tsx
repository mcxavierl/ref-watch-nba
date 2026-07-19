import type { Metadata } from "next";
import { ResearchArticlePage } from "@/components/ResearchArticlePage";
import { LEVERAGE_SPIKE_ANOMALY_ARTICLE } from "@/lib/research-articles/leverage-spike-anomaly";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "The Leverage-Spike Anomaly",
  description:
    "A concise Ref Watch research brief on historical high-leverage penalty frequency: why volume metrics miss pressure-state behavior, and how the Game-State Index and LWIS surface the gap.",
  path: "/research/leverage-spike-anomaly",
  keywords: [
    "leverage spike anomaly",
    "high-leverage penalty frequency",
    "Game-State Index",
    "LWIS",
    "NFL officiating research",
  ],
});

export default function LeverageSpikeAnomalyPage() {
  return <ResearchArticlePage article={LEVERAGE_SPIKE_ANOMALY_ARTICLE} />;
}
