import {
  Activity,
  Flag,
  Home,
  LineChart,
  Percent,
  Scale,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Whistle } from "@/components/icons/Whistle";
import { statValueDelightTone, signedDeltaTone } from "@/lib/metric-delight";
import type { RankingsInsight } from "@/lib/rankings-synthesis";

export type HighlightCardTone = "positive" | "negative" | "neutral";

/** Soft accent used for icon wells and card glow (independent of metric sign). */
export type HighlightCardAccent =
  | "scoring"
  | "over"
  | "ats"
  | "ou"
  | "whistle"
  | "flags"
  | "leverage"
  | "balance"
  | "default";

const INSIGHT_ACCENT: Record<string, HighlightCardAccent> = {
  "top-scoring": "scoring",
  "top-over": "over",
  "top-ats": "ats",
  "top-ou-betting": "ou",
  "top-whistle": "whistle",
  "ref-team-split": "default",
  "marquee-matchup": "leverage",
  "marquee-efficiency": "leverage",
};

const LEADER_CATEGORY_ACCENT: Record<string, HighlightCardAccent> = {
  scoring: "scoring",
  overRate: "over",
  flags: "flags",
  fouls: "whistle",
  yellowCards: "flags",
  penalties: "flags",
  penaltyYards: "flags",
  leverageImpact: "leverage",
  balance: "balance",
  homeCover: "ats",
};

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  "top-scoring": TrendingUp,
  "top-over": Percent,
  "top-ats": Home,
  "top-ou-betting": LineChart,
  "top-whistle": Whistle,
  "ref-team-split": Scale,
  "marquee-matchup": Zap,
  "marquee-efficiency": Zap,
};

const LEADER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  scoring: TrendingUp,
  overRate: Percent,
  flags: Flag,
  fouls: Whistle,
  yellowCards: Flag,
  penalties: Flag,
  penaltyYards: Flag,
  leverageImpact: Zap,
  balance: Scale,
  homeCover: Home,
};

function toneFromStatValue(statValue?: string): HighlightCardTone {
  if (!statValue) return "neutral";
  const delight = statValueDelightTone(statValue);
  if (delight === "positive" || delight === "standout-high") return "positive";
  if (delight === "negative" || delight === "standout-low") return "negative";
  return "neutral";
}

const SEMANTIC_INSIGHT_IDS = new Set([
  "top-over",
  "top-ats",
  "top-ou-betting",
]);

const SEMANTIC_LEADER_CATEGORIES = new Set(["overRate", "balance"]);

export function rankingsInsightCardTone(insight: RankingsInsight): HighlightCardTone {
  if (!SEMANTIC_INSIGHT_IDS.has(insight.id)) return "neutral";
  return toneFromStatValue(insight.statValue);
}

export function leaderHighlightTone(
  category: string,
  value?: string,
  delta?: number,
): HighlightCardTone {
  if (!SEMANTIC_LEADER_CATEGORIES.has(category)) return "neutral";
  if (delta !== undefined) {
    const tone = signedDeltaTone(delta);
    if (tone !== "neutral") return tone;
  }
  return toneFromStatValue(value);
}

export function highlightCardAccentForInsight(insightId: string): HighlightCardAccent {
  if (INSIGHT_ACCENT[insightId]) return INSIGHT_ACCENT[insightId]!;
  if (insightId.startsWith("ref-team-split")) return "default";
  if (insightId.startsWith("marquee-matchup")) return "leverage";
  return "default";
}

export function highlightCardAccentForLeaderCategory(
  category: string,
): HighlightCardAccent {
  return LEADER_CATEGORY_ACCENT[category] ?? "default";
}

export function highlightCardIconForInsight(insightId: string): LucideIcon {
  if (INSIGHT_ICONS[insightId]) return INSIGHT_ICONS[insightId]!;
  if (insightId.startsWith("ref-team-split")) return Scale;
  if (insightId.startsWith("marquee-matchup")) return Zap;
  return Activity;
}

export function highlightCardIconForLeaderCategory(category: string): LucideIcon {
  return LEADER_CATEGORY_ICONS[category] ?? Activity;
}

const INSIGHT_PILL_LABELS: Record<string, string> = {
  "top-scoring": "Scoring",
  "bottom-scoring": "Scoring",
  "scoring-depth": "Scoring",
  "top-over": "Over rate",
  "top-under": "Over rate",
  "over-depth": "Over rate",
  "top-ats": "ATS",
  "top-ou-betting": "O/U",
  "top-whistle": "Whistle",
  "light-whistle": "Whistle",
  "whistle-depth": "Whistle",
  "sample-depth": "Sample",
  "gsni-highlight": "Game-State Index",
  "ref-outlier": "Outlier",
  "team-crew": "Team crew",
  "whistle-extreme": "Whistle",
  "scoring-extreme": "Scoring",
  "ats-edge": "ATS",
  "ou-edge": "O/U",
  "ref-team-split": "Ref-team",
  "marquee-matchup": "Marquee",
  "marquee-efficiency": "Marquee",
  "coach-friction": "Coach",
  "player-friction": "Player",
  "league-trend": "Trend",
};

export function insightPillLabel(insightId: string, fallback?: string): string {
  return INSIGHT_PILL_LABELS[insightId] ?? fallback ?? "Insight";
}

export function spotlightAccentForCard(card: {
  kicker: string;
  heroLabel: string;
}): HighlightCardAccent {
  if (/over rate|under rate/i.test(`${card.kicker} ${card.heroLabel}`)) {
    return "over";
  }
  if (/games/i.test(card.heroLabel)) {
    return "scoring";
  }
  return "default";
}

export function spotlightIconForCard(card: {
  kicker: string;
  heroLabel: string;
}): LucideIcon {
  if (/over rate|under rate/i.test(`${card.kicker} ${card.heroLabel}`)) {
    return Percent;
  }
  if (/games/i.test(card.heroLabel)) {
    return TrendingUp;
  }
  return Activity;
}

export function spotlightCardTone(
  heroTone: "positive" | "negative" | "neutral",
): HighlightCardTone {
  if (heroTone === "positive") return "positive";
  if (heroTone === "negative") return "negative";
  return "neutral";
}
