import type { Metadata } from "next";
import { ResearchArticlePage } from "@/components/ResearchArticlePage";
import { LEVERAGE_SPIKE_ANOMALY_ARTICLE } from "@/lib/research-articles/leverage-spike-anomaly";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "The Leverage-Spike Anomaly",
  description:
    "A concise Ref Watch research brief on referee pressure elasticity: why volume metrics miss clutch whistle behavior, and how GSNI and LWIS surface the gap.",
  path: "/research/leverage-spike-anomaly",
  keywords: [
    "leverage spike anomaly",
    "referee pressure elasticity",
    "GSNI",
    "LWIS",
    "NFL officiating research",
  ],
});

export default function LeverageSpikeAnomalyPage() {
  return <ResearchArticlePage article={LEVERAGE_SPIKE_ANOMALY_ARTICLE} />;
}
